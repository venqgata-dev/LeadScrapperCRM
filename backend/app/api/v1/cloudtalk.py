import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.business import Business, CloudTalkCall
from app.schemas.cloudtalk import (
    CloudTalkCallInitiateResponse,
    CloudTalkCallRead,
    CloudTalkContactSyncResponse,
    CloudTalkStatusResponse,
    WebhookPayload,
)
from app.services.cloudtalk import (
    CloudTalkAgentBusyError,
    CloudTalkAgentOfflineError,
    CloudTalkAuthError,
    CloudTalkError,
    get_client,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Status / test
# ---------------------------------------------------------------------------

@router.get("/cloudtalk/status", response_model=CloudTalkStatusResponse)
def cloudtalk_status() -> CloudTalkStatusResponse:
    """Return whether CloudTalk is configured and reachable."""
    settings = get_settings()
    if not settings.cloudtalk_api_key:
        return CloudTalkStatusResponse(configured=False, connected=False)
    try:
        client = get_client()
        info = client.test_connection()
        return CloudTalkStatusResponse(configured=True, connected=True, account_info=info)
    except CloudTalkAuthError as exc:
        return CloudTalkStatusResponse(configured=True, connected=False, error=str(exc))
    except CloudTalkError as exc:
        return CloudTalkStatusResponse(configured=True, connected=False, error=str(exc))


@router.post("/cloudtalk/test", response_model=CloudTalkStatusResponse)
def cloudtalk_test() -> CloudTalkStatusResponse:
    """Actively test the CloudTalk connection and return account info."""
    return cloudtalk_status()


# ---------------------------------------------------------------------------
# Contact sync
# ---------------------------------------------------------------------------

@router.post("/cloudtalk/sync-contact/{business_id}", response_model=CloudTalkContactSyncResponse)
def sync_contact(business_id: int, db: Session = Depends(get_db)) -> CloudTalkContactSyncResponse:
    """Search CloudTalk for an existing contact; create one if not found."""
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    try:
        client = get_client()
    except CloudTalkError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # If already linked, verify the contact still exists in CloudTalk
    if business.cloudtalk_contact_id:
        existing = client.get_contact(business.cloudtalk_contact_id)
        if existing and existing.id:
            return CloudTalkContactSyncResponse(
                cloudtalk_contact_id=business.cloudtalk_contact_id,
                created=False,
            )

    # Search by phone number
    found = None
    if business.phone:
        found = client.search_contact_by_phone(business.phone)

    if found and found.id:
        business.cloudtalk_contact_id = found.id
        db.commit()
        return CloudTalkContactSyncResponse(cloudtalk_contact_id=found.id, created=False)

    # No match — create new contact
    try:
        created = client.create_contact(
            name=business.name,
            phone=business.phone,
            email=business.email,
            company=business.name,
        )
    except CloudTalkError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to create CloudTalk contact: {exc}",
        ) from exc

    business.cloudtalk_contact_id = created.id
    db.commit()
    return CloudTalkContactSyncResponse(cloudtalk_contact_id=created.id, created=True)


# ---------------------------------------------------------------------------
# Initiate call
# ---------------------------------------------------------------------------

@router.post("/cloudtalk/call/{business_id}", response_model=CloudTalkCallInitiateResponse)
def initiate_call(business_id: int, db: Session = Depends(get_db)) -> CloudTalkCallInitiateResponse:
    """Sync contact if needed, then initiate an outbound call.

    CloudTalk /calls/create.json first calls the configured agent; once the
    agent picks up, it dials the business. No call ID is returned — the call
    record is created with status INITIATED and updated later via webhook.
    """
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if not business.phone:
        raise HTTPException(status_code=422, detail="Business has no phone number")

    settings = get_settings()
    if not settings.cloudtalk_agent_id:
        raise HTTPException(
            status_code=503,
            detail="CLOUDTALK_AGENT_ID is not configured — set it in .env to enable outbound calls",
        )

    try:
        client = get_client()
    except CloudTalkError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # Auto-sync contact if not yet linked (non-fatal if it fails)
    if not business.cloudtalk_contact_id:
        try:
            sync_result = sync_contact(business_id, db)
            db.refresh(business)
            logger.info(
                "cloudtalk: auto-synced contact for business %d → %s (created=%s)",
                business_id, sync_result.cloudtalk_contact_id, sync_result.created,
            )
        except HTTPException as exc:
            logger.warning(
                "cloudtalk: contact sync failed for business %d: %s",
                business_id, exc.detail,
            )

    try:
        client.initiate_call(
            callee_number=business.phone,
            agent_id=settings.cloudtalk_agent_id,
        )
    except CloudTalkAgentOfflineError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except CloudTalkAgentBusyError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except CloudTalkError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to initiate call: {exc}") from exc

    # Record call in our DB — no call ID from CloudTalk, will be updated by webhook
    ct_call = CloudTalkCall(
        business_id=business_id,
        cloudtalk_call_id=None,
        direction="outgoing",
        status="INITIATED",
        started_at=datetime.now(UTC),
    )
    db.add(ct_call)
    db.commit()

    return CloudTalkCallInitiateResponse(
        cloudtalk_call_id=None,
        message=(
            f"Calling agent first — once answered, CloudTalk will dial {business.phone}. "
            "The call will appear in history after completion."
        ),
    )


# ---------------------------------------------------------------------------
# Call history (local DB records, updated via webhooks)
# ---------------------------------------------------------------------------

@router.get("/cloudtalk/calls/{business_id}", response_model=list[CloudTalkCallRead])
def get_calls(business_id: int, db: Session = Depends(get_db)) -> list[CloudTalkCall]:
    """Return CloudTalk call records for a business from the local DB."""
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    stmt = (
        select(CloudTalkCall)
        .where(CloudTalkCall.business_id == business_id)
        .order_by(CloudTalkCall.created_at.desc())
    )
    return list(db.scalars(stmt))


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------

@router.post("/cloudtalk/webhook", status_code=200)
def cloudtalk_webhook(payload: WebhookPayload, db: Session = Depends(get_db)) -> dict:
    """Receive CloudTalk webhook events and update CRM call records.

    CloudTalk sends POST to this URL for: call.started, call.answered,
    call.finished, recording.ready.

    Configure in CloudTalk Dashboard → Settings → Integrations → Webhooks.
    """
    event = payload.event
    call_data = payload.call or {}
    ext_call_id = str(call_data.get("id", "")).strip() if call_data else ""

    logger.info("CloudTalk webhook: event=%s call_id=%s", event, ext_call_id or "(none)")

    if not ext_call_id:
        return {"status": "ok", "detail": "no call id in payload"}

    # Try to find existing record by CloudTalk call ID
    stmt = select(CloudTalkCall).where(CloudTalkCall.cloudtalk_call_id == ext_call_id)
    ct_call: CloudTalkCall | None = db.scalars(stmt).first()

    # If no record found, look up by contact_id and create one
    if ct_call is None:
        contact_id = str(call_data.get("contact_id", "")).strip()
        if contact_id:
            biz_stmt = select(Business).where(Business.cloudtalk_contact_id == contact_id)
            business = db.scalars(biz_stmt).first()
            if business:
                ct_call = CloudTalkCall(
                    business_id=business.id,
                    cloudtalk_call_id=ext_call_id,
                    direction=str(call_data.get("type", "incoming")),
                    status="",
                )
                db.add(ct_call)
                logger.info(
                    "CloudTalk webhook: created new call record for business %d, call %s",
                    business.id, ext_call_id,
                )

    # Also try: find INITIATED record for this business (most recent, no call ID yet)
    if ct_call is None:
        initiated_stmt = (
            select(CloudTalkCall)
            .where(
                CloudTalkCall.cloudtalk_call_id.is_(None),
                CloudTalkCall.status == "INITIATED",
            )
            .order_by(CloudTalkCall.created_at.desc())
            .limit(1)
        )
        initiated = db.scalars(initiated_stmt).first()
        if initiated:
            initiated.cloudtalk_call_id = ext_call_id
            ct_call = initiated

    if ct_call is None:
        logger.warning("CloudTalk webhook: could not match call_id=%s to any business", ext_call_id)
        return {"status": "ok", "detail": "call not matched to any business"}

    # Apply event updates
    if event in ("call.started", "call.initiated"):
        ct_call.status = "STARTED"
        _set_started_at(ct_call, call_data)

    elif event == "call.answered":
        ct_call.status = "ANSWERED"
        _set_started_at(ct_call, call_data)

    elif event in ("call.finished", "call.ended"):
        duration_raw = call_data.get("talking_time") or call_data.get("duration") or call_data.get("billsec")
        ct_call.duration = int(duration_raw) if duration_raw is not None else None
        ct_call.status = _map_finish_status(call_data)
        end_raw = call_data.get("ended_at") or call_data.get("end_time") or call_data.get("endedAt")
        if end_raw:
            ct_call.ended_at = _parse_dt(end_raw)
        _set_started_at(ct_call, call_data)
        # recording_link may come with call.finished
        if call_data.get("recording_link"):
            ct_call.recording_url = call_data["recording_link"]

    elif event == "recording.ready":
        recording = payload.recording or {}
        url = (
            recording.get("url")
            or recording.get("recording_url")
            or recording.get("link")
            or call_data.get("recording_link")
        )
        if url:
            ct_call.recording_url = url

    db.commit()
    return {"status": "ok"}


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _set_started_at(call: CloudTalkCall, data: dict) -> None:
    if call.started_at:
        return
    raw = (
        data.get("started_at")
        or data.get("start_time")
        or data.get("answered_at")
        or data.get("startedAt")
    )
    if raw:
        call.started_at = _parse_dt(raw)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _map_finish_status(data: dict) -> str:
    """Map CloudTalk status strings to our internal status."""
    raw = str(data.get("status", "")).lower()
    if raw in ("answered",):
        return "answered"
    if raw in ("missed", "no_answer"):
        return "missed"
    if raw in ("busy",):
        return "busy"
    if raw in ("failed",):
        return "failed"
    # Determine from talking_time if status is absent
    talking = data.get("talking_time") or data.get("billsec")
    if talking and int(talking) > 0:
        return "answered"
    return "missed"
