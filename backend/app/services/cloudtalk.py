"""CloudTalk REST API client.

Verified against the official OpenAPI spec at:
  https://developers.cloudtalk.io/swagger.json  (retrieved 2026-06-25)

Base URL: https://my.cloudtalk.io/api
Auth:     HTTP Basic — Base64("ACCESS_KEY_ID:ACCESS_KEY_SECRET")
          Store as CLOUDTALK_API_KEY="key_id:key_secret" in .env

All paths end in .json and use sub-resource naming (e.g. /agents/index.json,
/contacts/add.json), NOT a flat /agents.json or /contacts.json.

Outbound calls require CLOUDTALK_AGENT_ID (integer) in .env — the call first
rings the configured agent, then connects to the callee once the agent picks up.
No call ID is returned from /calls/create.json.
"""
import base64
import logging
import time
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_BASE_URL = "https://my.cloudtalk.io/api"
_TIMEOUT = 15.0
_MAX_RETRIES = 3

# Status codes that indicate transient failures worth retrying
_RETRY_STATUSES = {429, 500, 502, 503, 504}


class CloudTalkError(Exception):
    pass


class CloudTalkAuthError(CloudTalkError):
    pass


class CloudTalkAgentOfflineError(CloudTalkError):
    pass


class CloudTalkAgentBusyError(CloudTalkError):
    pass


@dataclass
class CloudTalkContact:
    id: str
    name: str
    phone: str | None
    email: str | None
    company: str | None


@dataclass
class CloudTalkCallInfo:
    id: str
    direction: str       # "incoming" | "outgoing" | "internal"
    status: str          # "answered" | "missed"
    duration: int | None  # talking_time in seconds
    started_at: str | None
    ended_at: str | None
    recording_url: str | None
    agent: str | None


class CloudTalkClient:
    def __init__(self, api_key: str) -> None:
        # api_key must be "ACCESS_KEY_ID:ACCESS_KEY_SECRET"
        encoded = base64.b64encode(api_key.encode()).decode()
        self._headers: dict[str, str] = {
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    # ------------------------------------------------------------------
    # Low-level HTTP with retry
    # ------------------------------------------------------------------

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        """Make a request to the CloudTalk API, retrying on transient errors."""
        url = f"{_BASE_URL}{path}"
        last_exc: Exception | None = None

        for attempt in range(_MAX_RETRIES):
            try:
                with httpx.Client(timeout=_TIMEOUT) as client:
                    resp = client.request(method, url, headers=self._headers, **kwargs)

                if resp.status_code in _RETRY_STATUSES and attempt < _MAX_RETRIES - 1:
                    wait = 2 ** attempt
                    logger.warning(
                        "CloudTalk %s %s → %d (attempt %d/%d), retrying in %ds",
                        method, path, resp.status_code, attempt + 1, _MAX_RETRIES, wait,
                    )
                    time.sleep(wait)
                    continue

                if resp.status_code == 401:
                    raise CloudTalkAuthError(
                        "CloudTalk API returned 401 Unauthorized — check CLOUDTALK_API_KEY"
                    )
                if resp.status_code == 403:
                    body = _safe_json(resp)
                    msg = _extract_message(body) or "Forbidden"
                    raise CloudTalkAgentOfflineError(f"CloudTalk 403: {msg}")

                if resp.status_code == 409:
                    raise CloudTalkAgentBusyError(
                        "CloudTalk 409: Agent is already on a call"
                    )

                if not resp.is_success:
                    body_text = resp.text[:400]
                    logger.error(
                        "CloudTalk %s %s → %d: %s",
                        method, path, resp.status_code, body_text,
                    )
                    raise CloudTalkError(
                        f"CloudTalk {resp.status_code}: {_extract_message(_safe_json(resp)) or body_text[:200]}"
                    )

                return _safe_json(resp)

            except httpx.TimeoutException as exc:
                last_exc = exc
                logger.warning(
                    "CloudTalk timeout on attempt %d: %s %s",
                    attempt + 1, method, path,
                )
                if attempt < _MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)

            except httpx.RequestError as exc:
                raise CloudTalkError(f"CloudTalk network error: {exc}") from exc

        raise CloudTalkError(
            f"CloudTalk request timed out after {_MAX_RETRIES} attempts: {method} {path}"
        ) from last_exc

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        return self._request("GET", path, params=params)

    def _put(self, path: str, json: dict[str, Any] | None = None) -> Any:
        return self._request("PUT", path, json=json)

    def _post(self, path: str, json: dict[str, Any] | None = None) -> Any:
        return self._request("POST", path, json=json)

    # ------------------------------------------------------------------
    # Connection test
    # ------------------------------------------------------------------

    def test_connection(self) -> dict[str, Any]:
        """Verify credentials using GET /agents/index.json.

        Returns the raw responseData dict on success, raises CloudTalkError on failure.
        """
        data = self._get("/agents/index.json", params={"limit": 1})
        return data.get("responseData", data) if isinstance(data, dict) else {}

    # ------------------------------------------------------------------
    # Contacts
    # ------------------------------------------------------------------

    def search_contact_by_phone(self, phone: str) -> CloudTalkContact | None:
        """Search contacts using the `keyword` param (searches name, company, phone).

        Endpoint: GET /contacts/index.json?keyword=<phone>&limit=5
        Returns the first match whose ContactNumber matches the given phone, or
        the first result if no exact match found.
        """
        try:
            data = self._get("/contacts/index.json", params={"keyword": phone, "limit": 5})
            items = _unwrap_list(data)
            if not items:
                return None
            # Try exact phone match first
            normalized = _strip_spaces(phone)
            for item in items:
                numbers = item.get("ContactNumber") or []
                if isinstance(numbers, list):
                    for num_obj in numbers:
                        stored = _strip_spaces(str(num_obj.get("public_number", "")))
                        if stored and (stored == normalized or stored.endswith(normalized[-9:])):
                            return _parse_contact_list_item(item)
                elif isinstance(numbers, dict):
                    stored = _strip_spaces(str(numbers.get("public_number", "")))
                    if stored and (stored == normalized or stored.endswith(normalized[-9:])):
                        return _parse_contact_list_item(item)
            # Fall back to first result
            return _parse_contact_list_item(items[0])
        except CloudTalkError:
            logger.warning("CloudTalk: contact search failed for phone %s", phone)
            return None

    def create_contact(
        self,
        name: str,
        phone: str | None,
        email: str | None,
        company: str | None,
    ) -> CloudTalkContact:
        """Create a contact.

        Endpoint: PUT /contacts/add.json
        Returns 201 with responseData.data.id on success.
        """
        body: dict[str, Any] = {"name": name}
        if company:
            body["company"] = company
        if phone:
            # Ensure E.164 format (CloudTalk requires international format)
            body["ContactNumber"] = [{"public_number": _to_e164(phone)}]
        if email:
            body["ContactEmail"] = [{"email": email}]

        data = self._put("/contacts/add.json", json=body)
        resp = data.get("responseData", {}) if isinstance(data, dict) else {}
        contact_id = str(resp.get("data", {}).get("id", "") if isinstance(resp.get("data"), dict) else "")
        if not contact_id:
            raise CloudTalkError("Contact created but no ID returned in response")

        return CloudTalkContact(
            id=contact_id,
            name=name,
            phone=phone,
            email=email,
            company=company,
        )

    def get_contact(self, contact_id: str) -> CloudTalkContact | None:
        """Fetch a contact by ID.

        Endpoint: GET /contacts/show/{contactId}.json
        """
        try:
            data = self._get(f"/contacts/show/{contact_id}.json")
            resp = data.get("responseData", {}) if isinstance(data, dict) else {}
            return _parse_contact_show(resp)
        except CloudTalkError:
            logger.warning("CloudTalk: get_contact failed for id=%s", contact_id)
            return None

    # ------------------------------------------------------------------
    # Calls
    # ------------------------------------------------------------------

    def initiate_call(self, callee_number: str, agent_id: int) -> None:
        """Initiate an outbound call.

        Endpoint: POST /calls/create.json
        Required body: { "agent_id": <int>, "callee_number": "<E.164>" }

        The call first rings the agent; once the agent picks up CloudTalk dials
        the callee. The response is { "responseData": { "status": 200 } } —
        no call ID is returned by this endpoint.

        Raises:
            CloudTalkAgentOfflineError: agent is not online (403)
            CloudTalkAgentBusyError:    agent is already on a call (409)
        """
        self._post("/calls/create.json", json={
            "agent_id": agent_id,
            "callee_number": _to_e164(callee_number),
        })

    def get_calls_for_contact(self, contact_id: str, limit: int = 20) -> list[CloudTalkCallInfo]:
        """Fetch call history for a specific contact.

        Endpoint: GET /calls/index.json?contact_id=<id>&limit=<n>
        Each item contains a Cdr sub-object with call metadata.
        """
        try:
            data = self._get(
                "/calls/index.json",
                params={"contact_id": int(contact_id), "limit": limit},
            )
            items = _unwrap_list(data)
            return [_parse_call_item(c) for c in items if c.get("Cdr")]
        except (CloudTalkError, ValueError):
            logger.warning("CloudTalk: get_calls_for_contact failed for contact_id=%s", contact_id)
            return []

    def get_calls_by_phone(self, phone: str, limit: int = 20) -> list[CloudTalkCallInfo]:
        """Fetch call history by external phone number (fallback when no contact_id).

        Endpoint: GET /calls/index.json?public_external=<phone>&limit=<n>
        """
        try:
            data = self._get(
                "/calls/index.json",
                params={"public_external": _to_e164(phone), "limit": limit},
            )
            items = _unwrap_list(data)
            return [_parse_call_item(c) for c in items if c.get("Cdr")]
        except CloudTalkError:
            logger.warning("CloudTalk: get_calls_by_phone failed for %s", phone)
            return []


# ------------------------------------------------------------------
# Parsing helpers
# ------------------------------------------------------------------

def _safe_json(resp: httpx.Response) -> Any:
    try:
        return resp.json()
    except Exception:
        return {}


def _extract_message(data: Any) -> str | None:
    if not isinstance(data, dict):
        return None
    rd = data.get("responseData", data)
    if isinstance(rd, dict):
        return rd.get("message")
    return None


def _unwrap_list(data: Any) -> list[dict[str, Any]]:
    """Extract the data array from { responseData: { data: [...] } } responses."""
    if not isinstance(data, dict):
        return []
    rd = data.get("responseData", {})
    if isinstance(rd, dict):
        items = rd.get("data", [])
        if isinstance(items, list):
            return items
    return []


def _parse_contact_list_item(item: dict[str, Any]) -> CloudTalkContact:
    """Parse a contact from /contacts/index.json response item.

    Structure: { "Contact": {...}, "ContactNumber": {...}, "ContactEmail": {...} }
    """
    contact = item.get("Contact", {}) or {}
    numbers = item.get("ContactNumber") or {}
    emails = item.get("ContactEmail") or {}

    # ContactNumber may be a single object or list
    phone: str | None = None
    if isinstance(numbers, list) and numbers:
        phone = str(numbers[0].get("public_number", "")) or None
    elif isinstance(numbers, dict):
        phone = str(numbers.get("public_number", "")) or None

    email: str | None = None
    if isinstance(emails, list) and emails:
        email = str(emails[0].get("email", "")) or None
    elif isinstance(emails, dict):
        email = str(emails.get("email", "")) or None

    return CloudTalkContact(
        id=str(contact.get("id", "")),
        name=contact.get("name", ""),
        phone=phone,
        email=email,
        company=contact.get("company") or None,
    )


def _parse_contact_show(resp: dict[str, Any]) -> CloudTalkContact:
    """Parse a contact from /contacts/show/{id}.json responseData.

    Structure: { "Contact": {...}, "ContactNumber": [...], "ContactEmail": [...] }
    """
    contact = resp.get("Contact", {}) or {}
    numbers = resp.get("ContactNumber") or []
    emails = resp.get("ContactEmail") or []

    phone: str | None = None
    if isinstance(numbers, list) and numbers:
        first = numbers[0]
        phone = str(first.get("public_number", "")) or None
    elif isinstance(numbers, dict):
        phone = str(numbers.get("public_number", "")) or None

    email: str | None = None
    if isinstance(emails, list) and emails:
        first = emails[0]
        email = str(first.get("email", "")) or None
    elif isinstance(emails, dict):
        email = str(emails.get("email", "")) or None

    return CloudTalkContact(
        id=str(contact.get("id", "")),
        name=contact.get("name", ""),
        phone=phone,
        email=email,
        company=contact.get("company") or None,
    )


def _parse_call_item(item: dict[str, Any]) -> CloudTalkCallInfo:
    """Parse a call from /calls/index.json response item.

    Structure:
      { "Cdr": { "id", "type", "started_at", "ended_at", "talking_time",
                 "recording_link", ... },
        "Agent": { "fullname", ... }, "Contact": {...} }
    """
    cdr = item.get("Cdr", {}) or {}
    agent = item.get("Agent", {}) or {}

    agent_name: str | None = (
        agent.get("fullname") or agent.get("name") or None
        if isinstance(agent, dict) else None
    )

    # CloudTalk uses "incoming" | "outgoing" — normalise to consistent values
    direction = str(cdr.get("type", "outgoing"))

    # talking_time is the billed/answered duration; billsec is similar
    raw_duration = cdr.get("talking_time") or cdr.get("billsec")
    duration: int | None = int(raw_duration) if raw_duration is not None else None

    # recording_link is a direct play URL, e.g. https://my.cloudtalk.io/r/play/27
    recording_url: str | None = cdr.get("recording_link") or None

    return CloudTalkCallInfo(
        id=str(cdr.get("id", "")),
        direction=direction,
        status=_map_call_status(cdr),
        duration=duration,
        started_at=cdr.get("started_at") or cdr.get("answered_at"),
        ended_at=cdr.get("ended_at"),
        recording_url=recording_url,
        agent=agent_name,
    )


def _map_call_status(cdr: dict[str, Any]) -> str:
    """Derive a status string from Cdr fields."""
    if cdr.get("is_voicemail"):
        return "voicemail"
    talking = cdr.get("talking_time") or cdr.get("billsec")
    if talking and int(talking) > 0:
        return "answered"
    return "missed"


def _to_e164(phone: str) -> str:
    """Best-effort normalisation to E.164 format.

    CloudTalk requires international format (e.g. +442012345678).
    If the number already starts with + it is returned as-is.
    UK numbers without country code get +44 prefix.
    """
    stripped = "".join(c for c in phone if c.isdigit() or c == "+")
    if stripped.startswith("+"):
        return stripped
    # UK: starts with 07 → +447...
    if stripped.startswith("07") and len(stripped) == 11:
        return "+44" + stripped[1:]
    # UK: starts with 44...
    if stripped.startswith("44"):
        return "+" + stripped
    # Bulgaria: starts with 08 → +3598...
    if stripped.startswith("08") and len(stripped) == 10:
        return "+359" + stripped[1:]
    # Default: prepend + and hope for the best
    return "+" + stripped if not stripped.startswith("+") else stripped


def _strip_spaces(s: str) -> str:
    return "".join(s.split())


# ------------------------------------------------------------------
# Factory
# ------------------------------------------------------------------

def get_client() -> CloudTalkClient:
    """Return a CloudTalkClient using the configured API key.

    Raises CloudTalkError if CLOUDTALK_API_KEY is not set.
    """
    settings = get_settings()
    if not settings.cloudtalk_api_key:
        raise CloudTalkError("CLOUDTALK_API_KEY is not configured")
    return CloudTalkClient(settings.cloudtalk_api_key)
