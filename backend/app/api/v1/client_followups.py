"""Client Follow-up System."""
from __future__ import annotations

import os
import shutil
import uuid
from datetime import date, datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.business import Business
from app.models.client_followup import ClientDocument, ClientFollowUp
from app.schemas.client_followup import DocumentRead, DocumentUpdate, FollowUpCreate, FollowUpRead, FollowUpUpdate

router = APIRouter(tags=["client-followups"])

UPLOAD_DIR = "/app/uploads"


# ─── Follow-ups ───────────────────────────────────────────────────────────────

@router.get("/followups", response_model=list[FollowUpRead])
def list_followups(
    db: Annotated[Session, Depends(get_db)],
    business_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
):
    q = select(ClientFollowUp)
    if business_id:
        q = q.where(ClientFollowUp.business_id == business_id)
    if status:
        q = q.where(ClientFollowUp.status == status)
    if from_date:
        q = q.where(ClientFollowUp.follow_up_date >= from_date)
    if to_date:
        q = q.where(ClientFollowUp.follow_up_date <= to_date)
    q = q.order_by(ClientFollowUp.follow_up_date.asc(), ClientFollowUp.follow_up_time.asc().nulls_last())
    rows = db.execute(q).scalars().all()

    result = []
    for r in rows:
        biz = db.get(Business, r.business_id)
        d = FollowUpRead.model_validate(r)
        d.business_name = biz.name if biz else None
        result.append(d)
    return result


@router.post("/followups", response_model=FollowUpRead, status_code=201)
def create_followup(payload: FollowUpCreate, db: Annotated[Session, Depends(get_db)]):
    biz = db.get(Business, payload.business_id)
    if not biz:
        raise HTTPException(404, "Business not found")
    fu = ClientFollowUp(**payload.model_dump())
    db.add(fu)
    db.commit()
    db.refresh(fu)
    result = FollowUpRead.model_validate(fu)
    result.business_name = biz.name
    return result


@router.patch("/followups/{fu_id}", response_model=FollowUpRead)
def update_followup(fu_id: int, payload: FollowUpUpdate, db: Annotated[Session, Depends(get_db)]):
    fu = db.get(ClientFollowUp, fu_id)
    if not fu:
        raise HTTPException(404, "Follow-up not found")
    data = payload.model_dump(exclude_none=True)
    if data.get("status") == "COMPLETED" and not fu.completed_at:
        data["completed_at"] = datetime.now(timezone.utc)
    for k, v in data.items():
        setattr(fu, k, v)
    db.commit()
    db.refresh(fu)
    biz = db.get(Business, fu.business_id)
    result = FollowUpRead.model_validate(fu)
    result.business_name = biz.name if biz else None
    return result


@router.delete("/followups/{fu_id}", status_code=204)
def delete_followup(fu_id: int, db: Annotated[Session, Depends(get_db)]):
    fu = db.get(ClientFollowUp, fu_id)
    if not fu:
        raise HTTPException(404, "Follow-up not found")
    db.delete(fu)
    db.commit()


@router.get("/followups/today", response_model=list[FollowUpRead])
def followups_today(db: Annotated[Session, Depends(get_db)]):
    today = date.today()
    rows = db.execute(
        select(ClientFollowUp)
        .where(ClientFollowUp.follow_up_date == today, ClientFollowUp.status == "PENDING")
        .order_by(ClientFollowUp.follow_up_time.asc().nulls_last())
    ).scalars().all()
    result = []
    for r in rows:
        biz = db.get(Business, r.business_id)
        d = FollowUpRead.model_validate(r)
        d.business_name = biz.name if biz else None
        result.append(d)
    return result


@router.get("/followups/overdue", response_model=list[FollowUpRead])
def followups_overdue(db: Annotated[Session, Depends(get_db)]):
    today = date.today()
    rows = db.execute(
        select(ClientFollowUp)
        .where(ClientFollowUp.follow_up_date < today, ClientFollowUp.status == "PENDING")
        .order_by(ClientFollowUp.follow_up_date.asc())
    ).scalars().all()
    result = []
    for r in rows:
        biz = db.get(Business, r.business_id)
        d = FollowUpRead.model_validate(r)
        d.business_name = biz.name if biz else None
        result.append(d)
    return result


# ─── Documents ────────────────────────────────────────────────────────────────

@router.get("/businesses/{biz_id}/documents", response_model=list[DocumentRead])
def list_documents(biz_id: int, db: Annotated[Session, Depends(get_db)]):
    rows = db.execute(
        select(ClientDocument)
        .where(ClientDocument.business_id == biz_id)
        .order_by(ClientDocument.uploaded_at.desc())
    ).scalars().all()
    return rows


@router.post("/businesses/{biz_id}/documents", response_model=DocumentRead, status_code=201)
def upload_document(
    biz_id: int,
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
    category: str = Form("OTHER"),
    notes: str = Form(""),
):
    biz = db.get(Business, biz_id)
    if not biz:
        raise HTTPException(404, "Business not found")

    os.makedirs(f"{UPLOAD_DIR}/{biz_id}", exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest = f"{UPLOAD_DIR}/{biz_id}/{stored_name}"
    with open(dest, "wb") as f_out:
        shutil.copyfileobj(file.file, f_out)

    size = os.path.getsize(dest)
    doc = ClientDocument(
        business_id=biz_id,
        filename=stored_name,
        original_name=file.filename or stored_name,
        category=category,
        file_size=size,
        mime_type=file.content_type,
        notes=notes or None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents/{doc_id}/download")
def download_document(doc_id: int, db: Annotated[Session, Depends(get_db)]):
    from fastapi.responses import FileResponse
    doc = db.get(ClientDocument, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    path = f"{UPLOAD_DIR}/{doc.business_id}/{doc.filename}"
    if not os.path.exists(path):
        raise HTTPException(404, "File not found on disk")
    return FileResponse(path, filename=doc.original_name, media_type=doc.mime_type or "application/octet-stream")


@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(doc_id: int, db: Annotated[Session, Depends(get_db)]):
    doc = db.get(ClientDocument, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    path = f"{UPLOAD_DIR}/{doc.business_id}/{doc.filename}"
    if os.path.exists(path):
        os.remove(path)
    db.delete(doc)
    db.commit()


@router.patch("/documents/{doc_id}", response_model=DocumentRead)
def update_document(doc_id: int, payload: DocumentUpdate, db: Annotated[Session, Depends(get_db)]):
    doc = db.get(ClientDocument, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(doc, k, v)
    db.commit()
    db.refresh(doc)
    return doc
