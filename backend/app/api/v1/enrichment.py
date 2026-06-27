from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db
from app.schemas.business import BusinessRead
from app.schemas.enrichment import EnrichmentJobStatus, EnrichmentResult
from app.services import enrichment as svc

router = APIRouter(prefix="/enrichment", tags=["enrichment"])


@router.post("/business/{business_id}", response_model=BusinessRead)
def enrich_single(business_id: int, db: Session = Depends(get_db)):
    """Enrich a single business record. Never creates duplicates."""
    try:
        svc.enrich_business(business_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    from app.models.business import Business
    b = db.get(Business, business_id)
    if not b:
        raise HTTPException(status_code=404, detail="Business not found")
    return b


@router.post("/all")
def enrich_all(db: Session = Depends(get_db)):
    """Start batch enrichment for all enrichable businesses."""
    snap = svc._job_snapshot()
    if snap["running"]:
        return {"message": "Enrichment already running", "started": False}
    ids = svc.get_all_enrichable_ids(db)
    svc.enrich_batch(ids, SessionLocal)
    return {"message": f"Started enrichment for {len(ids)} businesses", "started": True, "count": len(ids)}


@router.post("/missing-email")
def enrich_missing_email(db: Session = Depends(get_db)):
    """Start batch enrichment targeting businesses with no email."""
    snap = svc._job_snapshot()
    if snap["running"]:
        return {"message": "Enrichment already running", "started": False}
    ids = svc.get_missing_email_ids(db)
    svc.enrich_batch(ids, SessionLocal)
    return {"message": f"Started email enrichment for {len(ids)} businesses", "started": True, "count": len(ids)}


@router.post("/missing-social")
def enrich_missing_social(db: Session = Depends(get_db)):
    """Start batch enrichment targeting businesses with missing social links."""
    snap = svc._job_snapshot()
    if snap["running"]:
        return {"message": "Enrichment already running", "started": False}
    ids = svc.get_missing_social_ids(db)
    svc.enrich_batch(ids, SessionLocal)
    return {"message": f"Started social enrichment for {len(ids)} businesses", "started": True, "count": len(ids)}


@router.post("/pause")
def pause_enrichment():
    svc.pause_job()
    return {"message": "Enrichment paused"}


@router.post("/resume")
def resume_enrichment():
    svc.resume_job()
    return {"message": "Enrichment resumed"}


@router.post("/stop")
def stop_enrichment():
    svc.stop_job()
    return {"message": "Enrichment stopping"}


@router.get("/status", response_model=EnrichmentJobStatus)
def enrichment_status(db: Session = Depends(get_db)):
    return svc.get_job_status(db)
