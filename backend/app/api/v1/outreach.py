"""AI Outreach & Sales Automation API."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.session import SessionLocal
from app.models.business import Business
from app.models.outreach import CallScript, EmailHistory, EmailTemplate, FollowUp, SalesCampaign, SalesTask
from app.models.sales_insight import SalesInsight
from app.schemas.outreach import (
    CallScriptRead,
    EmailHistoryRead,
    EmailTemplateCreate,
    EmailTemplateRead,
    FollowUpRead,
    GeneratedEmail,
    OutreachAnalytics,
    SalesCampaignCreate,
    SalesCampaignRead,
    SalesTaskRead,
    ScriptBatchStatus,
)
from app.services import outreach as svc

router = APIRouter(prefix="/outreach", tags=["outreach"])


# ---------------------------------------------------------------------------
# Campaigns
# ---------------------------------------------------------------------------

@router.post("/campaigns", response_model=SalesCampaignRead, status_code=201)
def create_campaign(payload: SalesCampaignCreate, db: Session = Depends(get_db)):
    campaign = svc.create_outreach_campaign(db, payload)
    row = _campaign_with_counts(campaign, db)
    return row


@router.get("/campaigns", response_model=list[SalesCampaignRead])
def list_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(SalesCampaign).order_by(SalesCampaign.created_at.desc()).all()
    return [_campaign_with_counts(c, db) for c in campaigns]


@router.get("/campaigns/{campaign_id}", response_model=SalesCampaignRead)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.get(SalesCampaign, campaign_id)
    if not c:
        raise HTTPException(404, "Campaign not found")
    return _campaign_with_counts(c, db)


@router.delete("/campaigns/{campaign_id}", status_code=204)
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.get(SalesCampaign, campaign_id)
    if not c:
        raise HTTPException(404, "Campaign not found")
    db.delete(c)
    db.commit()


def _campaign_with_counts(c: SalesCampaign, db: Session) -> dict:
    total = db.query(SalesTask).filter(SalesTask.campaign_id == c.id).count()
    pending = db.query(SalesTask).filter(SalesTask.campaign_id == c.id, SalesTask.status == "PENDING").count()
    done = db.query(SalesTask).filter(SalesTask.campaign_id == c.id, SalesTask.status == "COMPLETED").count()
    return {
        "id": c.id, "name": c.name, "description": c.description,
        "campaign_type": c.campaign_type, "status": c.status,
        "country": c.country, "category": c.category,
        "min_ai_score": c.min_ai_score, "min_project_value": c.min_project_value,
        "min_close_probability": c.min_close_probability,
        "target_count": c.target_count, "contacted_count": c.contacted_count,
        "replied_count": c.replied_count, "booked_count": c.booked_count,
        "task_count": total, "pending_tasks": pending, "completed_tasks": done,
        "created_at": c.created_at, "updated_at": c.updated_at,
    }


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@router.get("/tasks/today", response_model=list[SalesTaskRead])
def tasks_today(db: Session = Depends(get_db)):
    return svc.get_todays_tasks(db)


@router.get("/tasks/call-queue", response_model=list[SalesTaskRead])
def call_queue(campaign_id: int | None = Query(None), db: Session = Depends(get_db)):
    return svc.get_call_queue(db, campaign_id)


@router.get("/tasks/email-queue", response_model=list[SalesTaskRead])
def email_queue(campaign_id: int | None = Query(None), db: Session = Depends(get_db)):
    return svc.get_email_queue(db, campaign_id)


@router.post("/tasks/{task_id}/complete", response_model=SalesTaskRead)
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = svc.complete_task(task_id, db)
    if not task:
        raise HTTPException(404, "Task not found")
    b = task.business
    return {
        **_task_dict(task), "business_name": b.name, "business_phone": b.phone,
        "business_city": b.city, "business_category": b.category,
        "business_ai_score": b.ai_score, "business_ai_priority": b.ai_priority,
        "business_ai_project_value": b.ai_project_value, "business_ai_close_prob": b.ai_close_prob,
    }


@router.post("/tasks/{task_id}/skip", response_model=SalesTaskRead)
def skip_task(task_id: int, db: Session = Depends(get_db)):
    task = svc.skip_task(task_id, db)
    if not task:
        raise HTTPException(404, "Task not found")
    b = task.business
    return {
        **_task_dict(task), "business_name": b.name, "business_phone": b.phone,
        "business_city": b.city, "business_category": b.category,
        "business_ai_score": b.ai_score, "business_ai_priority": b.ai_priority,
        "business_ai_project_value": b.ai_project_value, "business_ai_close_prob": b.ai_close_prob,
    }


def _task_dict(t: SalesTask) -> dict:
    return {
        "id": t.id, "campaign_id": t.campaign_id, "business_id": t.business_id,
        "task_type": t.task_type, "status": t.status, "priority": t.priority,
        "due_date": t.due_date, "completed_at": t.completed_at, "notes": t.notes,
        "created_at": t.created_at,
    }


# ---------------------------------------------------------------------------
# Call Scripts
# ---------------------------------------------------------------------------

@router.get("/scripts/{business_id}", response_model=CallScriptRead)
def get_script(business_id: int, db: Session = Depends(get_db)):
    script = db.query(CallScript).filter(CallScript.business_id == business_id).first()
    if not script:
        raise HTTPException(404, "Call script not found")
    return script


@router.post("/scripts/generate/{business_id}", response_model=CallScriptRead)
def generate_script(business_id: int, db: Session = Depends(get_db)):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(404, "Business not found")
    insight = db.query(SalesInsight).filter(SalesInsight.business_id == business_id).first()
    return svc.generate_or_update_script(business, insight, db)


@router.post("/scripts/generate-all")
def generate_all_scripts(include_emails: bool = Query(False), db: Session = Depends(get_db)):
    if svc._snap()["running"]:
        return {"status": "already_running"}
    ids = [row[0] for row in db.query(Business.id).all()]
    svc.batch_generate(ids, SessionLocal, gen_emails=include_emails)
    return {"status": "started", "count": len(ids)}


@router.post("/scripts/generate-missing")
def generate_missing_scripts(include_emails: bool = Query(False), db: Session = Depends(get_db)):
    if svc._snap()["running"]:
        return {"status": "already_running"}
    existing_ids = {row[0] for row in db.query(CallScript.business_id).all()}
    all_ids = [row[0] for row in db.query(Business.id).all()]
    missing = [bid for bid in all_ids if bid not in existing_ids]
    svc.batch_generate(missing, SessionLocal, gen_emails=include_emails)
    return {"status": "started", "count": len(missing)}


@router.post("/scripts/pause")
def pause_scripts():
    svc.pause_batch()
    return {"status": "paused"}


@router.post("/scripts/resume")
def resume_scripts():
    svc.resume_batch()
    return {"status": "resumed"}


@router.post("/scripts/stop")
def stop_scripts():
    svc.stop_batch()
    return {"status": "stopped"}


@router.get("/scripts/status/current", response_model=ScriptBatchStatus)
def scripts_status(db: Session = Depends(get_db)):
    return svc.get_batch_status(db)


# ---------------------------------------------------------------------------
# Email Templates
# ---------------------------------------------------------------------------

@router.get("/templates", response_model=list[EmailTemplateRead])
def list_templates(db: Session = Depends(get_db)):
    svc.seed_templates(db)
    return db.query(EmailTemplate).order_by(EmailTemplate.id.asc()).all()


@router.post("/templates", response_model=EmailTemplateRead, status_code=201)
def create_template(payload: EmailTemplateCreate, db: Session = Depends(get_db)):
    t = EmailTemplate(**payload.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/templates/{template_id}", response_model=EmailTemplateRead)
def update_template(template_id: int, payload: EmailTemplateCreate, db: Session = Depends(get_db)):
    t = db.get(EmailTemplate, template_id)
    if not t:
        raise HTTPException(404, "Template not found")
    for k, v in payload.model_dump().items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    t = db.get(EmailTemplate, template_id)
    if not t:
        raise HTTPException(404, "Template not found")
    db.delete(t)
    db.commit()


# ---------------------------------------------------------------------------
# Emails
# ---------------------------------------------------------------------------

@router.post("/emails/generate/{business_id}", response_model=GeneratedEmail)
def generate_email(business_id: int, db: Session = Depends(get_db)):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(404, "Business not found")
    insight = db.query(SalesInsight).filter(SalesInsight.business_id == business_id).first()
    subject, body = svc.generate_email_content(business, insight, None, db)
    return GeneratedEmail(subject=subject, body=body, business_id=business.id, business_name=business.name)


@router.post("/emails/save/{business_id}", response_model=EmailHistoryRead)
def save_email(business_id: int, db: Session = Depends(get_db)):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(404, "Business not found")
    insight = db.query(SalesInsight).filter(SalesInsight.business_id == business_id).first()
    subject, body = svc.generate_email_content(business, insight, None, db)
    return svc.save_email_draft(business, subject, body, None, db)


@router.get("/emails/{business_id}", response_model=list[EmailHistoryRead])
def list_emails_for_business(business_id: int, db: Session = Depends(get_db)):
    return db.query(EmailHistory).filter(EmailHistory.business_id == business_id).order_by(EmailHistory.created_at.desc()).all()


# ---------------------------------------------------------------------------
# Follow-ups
# ---------------------------------------------------------------------------

@router.post("/follow-ups/{business_id}", response_model=list[FollowUpRead])
def create_follow_ups(business_id: int, outcome: str = Query("NO_ANSWER"), db: Session = Depends(get_db)):
    follow_ups = svc.schedule_follow_ups(business_id, outcome, db)
    result = []
    for f in follow_ups:
        b = db.get(Business, f.business_id)
        result.append({
            "id": f.id, "business_id": f.business_id, "task_id": f.task_id,
            "follow_up_type": f.follow_up_type, "scheduled_for": f.scheduled_for,
            "status": f.status, "notes": f.notes, "created_at": f.created_at,
            "business_name": b.name if b else "",
        })
    return result


@router.get("/follow-ups/pending", response_model=list[FollowUpRead])
def pending_follow_ups(db: Session = Depends(get_db)):
    rows = db.query(FollowUp).filter(FollowUp.status == "PENDING").order_by(FollowUp.scheduled_for.asc()).limit(100).all()
    result = []
    for f in rows:
        b = db.get(Business, f.business_id)
        result.append({
            "id": f.id, "business_id": f.business_id, "task_id": f.task_id,
            "follow_up_type": f.follow_up_type, "scheduled_for": f.scheduled_for,
            "status": f.status, "notes": f.notes, "created_at": f.created_at,
            "business_name": b.name if b else "",
        })
    return result


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@router.get("/analytics", response_model=OutreachAnalytics)
def analytics(db: Session = Depends(get_db)):
    return svc.get_analytics(db)
