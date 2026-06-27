from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.activity import Activity
from app.models.business import Business
from app.models.proposal import (
    ClientCredential, Project, ProjectComment, ProjectDeliverable, Proposal
)
from app.schemas.proposal import (
    CommentCreate, CommentRead, CommentUpdate,
    CredentialRead, CredentialUpsert,
    DeliverableCreate, DeliverableRead, DeliverableUpdate,
    ProjectCreate, ProjectRead, ProjectUpdate,
    ProposalCreate, ProposalRead, ProposalUpdate,
)

router = APIRouter(tags=["proposals"])


# ─── Proposals ────────────────────────────────────────────────────────────────

@router.get("/businesses/{business_id}/proposals", response_model=list[ProposalRead])
def list_proposals(business_id: int, db: Annotated[Session, Depends(get_db)]) -> list[ProposalRead]:
    rows = db.execute(
        select(Proposal).where(Proposal.business_id == business_id).order_by(desc(Proposal.created_at))
    ).scalars().all()
    return [ProposalRead.model_validate(r) for r in rows]


@router.post("/businesses/{business_id}/proposals", response_model=ProposalRead, status_code=201)
def create_proposal(business_id: int, payload: ProposalCreate, db: Annotated[Session, Depends(get_db)]) -> ProposalRead:
    proposal = Proposal(business_id=business_id, **payload.model_dump())
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return ProposalRead.model_validate(proposal)


@router.patch("/proposals/{proposal_id}", response_model=ProposalRead)
def update_proposal(proposal_id: int, payload: ProposalUpdate, db: Annotated[Session, Depends(get_db)]) -> ProposalRead:
    proposal = db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(proposal, k, v)
    proposal.updated_at = datetime.now(tz=timezone.utc)
    db.commit()
    db.refresh(proposal)
    return ProposalRead.model_validate(proposal)


@router.delete("/proposals/{proposal_id}", status_code=204)
def delete_proposal(proposal_id: int, db: Annotated[Session, Depends(get_db)]) -> None:
    proposal = db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    db.delete(proposal)
    db.commit()


# ─── Projects ─────────────────────────────────────────────────────────────────

def _project_read(p: Project, db: Session) -> ProjectRead:
    biz = db.get(Business, p.business_id)
    r = ProjectRead.model_validate(p)
    r.business_name = biz.name if biz else None
    return r


@router.get("/projects", response_model=list[ProjectRead])
def list_all_projects(
    db: Annotated[Session, Depends(get_db)],
    status: str | None = None,
    developer: str | None = None,
) -> list[ProjectRead]:
    stmt = select(Project).order_by(desc(Project.created_at))
    if status:
        stmt = stmt.where(Project.status == status)
    if developer:
        stmt = stmt.where(Project.developer == developer)
    return [_project_read(p, db) for p in db.execute(stmt).scalars()]


@router.get("/projects/stats")
def project_stats(db: Annotated[Session, Depends(get_db)]) -> dict:
    rows = db.execute(select(Project)).scalars().all()
    from datetime import date
    today = date.today()
    in_progress = [p for p in rows if p.status not in ("COMPLETED", "PLANNING")]
    overdue = [p for p in in_progress if p.expected_delivery and p.expected_delivery < today]
    completed = [p for p in rows if p.status == "COMPLETED"]
    return {
        "total": len(rows),
        "in_progress": len(in_progress),
        "completed": len(completed),
        "overdue": len(overdue),
        "planning": len([p for p in rows if p.status == "PLANNING"]),
    }


@router.get("/businesses/{business_id}/projects", response_model=list[ProjectRead])
def list_projects(business_id: int, db: Annotated[Session, Depends(get_db)]) -> list[ProjectRead]:
    rows = db.execute(
        select(Project).where(Project.business_id == business_id).order_by(desc(Project.created_at))
    ).scalars().all()
    return [_project_read(p, db) for p in rows]


@router.post("/businesses/{business_id}/projects", response_model=ProjectRead, status_code=201)
def create_project(business_id: int, payload: ProjectCreate, db: Annotated[Session, Depends(get_db)]) -> ProjectRead:
    project = Project(business_id=business_id, **payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return _project_read(project, db)


@router.get("/projects/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Annotated[Session, Depends(get_db)]) -> ProjectRead:
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_read(p, db)


@router.patch("/projects/{project_id}", response_model=ProjectRead)
def update_project(project_id: int, payload: ProjectUpdate, db: Annotated[Session, Depends(get_db)]) -> ProjectRead:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    old_status = project.status
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(project, k, v)
    project.updated_at = datetime.now(tz=timezone.utc)
    if payload.status and payload.status != old_status:
        biz = db.get(Business, project.business_id)
        db.add(Activity(
            event_type="PROJECT_STAGE_CHANGED",
            business_id=project.business_id,
            business_name=biz.name if biz else None,
            title=f"Project moved to {payload.status.replace('_', ' ').title()}",
            description=project.name,
        ))
        if payload.status == "COMPLETED":
            db.add(Activity(
                event_type="PROJECT_COMPLETED",
                business_id=project.business_id,
                business_name=biz.name if biz else None,
                title=f"Project completed: {project.name}",
            ))
    db.commit()
    db.refresh(project)
    return _project_read(project, db)


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Annotated[Session, Depends(get_db)]) -> None:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()


# ─── Deliverables ─────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/deliverables", response_model=list[DeliverableRead])
def list_deliverables(project_id: int, db: Annotated[Session, Depends(get_db)]) -> list[DeliverableRead]:
    rows = db.execute(
        select(ProjectDeliverable)
        .where(ProjectDeliverable.project_id == project_id)
        .order_by(ProjectDeliverable.sort_order)
    ).scalars().all()
    return [DeliverableRead.model_validate(r) for r in rows]


@router.post("/projects/{project_id}/deliverables", response_model=DeliverableRead, status_code=201)
def create_deliverable(project_id: int, payload: DeliverableCreate, db: Annotated[Session, Depends(get_db)]) -> DeliverableRead:
    d = ProjectDeliverable(project_id=project_id, **payload.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return DeliverableRead.model_validate(d)


@router.patch("/deliverables/{deliverable_id}", response_model=DeliverableRead)
def update_deliverable(deliverable_id: int, payload: DeliverableUpdate, db: Annotated[Session, Depends(get_db)]) -> DeliverableRead:
    d = db.get(ProjectDeliverable, deliverable_id)
    if not d:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(d, k, v)
    if payload.status == "DONE" and not d.completed_at:
        d.completed_at = datetime.now(tz=timezone.utc)
    elif payload.status == "PENDING":
        d.completed_at = None
    db.commit()
    db.refresh(d)
    return DeliverableRead.model_validate(d)


@router.delete("/deliverables/{deliverable_id}", status_code=204)
def delete_deliverable(deliverable_id: int, db: Annotated[Session, Depends(get_db)]) -> None:
    d = db.get(ProjectDeliverable, deliverable_id)
    if not d:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    db.delete(d)
    db.commit()


# ─── Comments ─────────────────────────────────────────────────────────────────

def _comment_read(c: ProjectComment) -> CommentRead:
    r = CommentRead.model_validate(c)
    r.replies = [CommentRead.model_validate(rep) for rep in c.replies]
    return r


@router.get("/projects/{project_id}/comments", response_model=list[CommentRead])
def list_comments(project_id: int, db: Annotated[Session, Depends(get_db)]) -> list[CommentRead]:
    rows = db.execute(
        select(ProjectComment)
        .where(ProjectComment.project_id == project_id, ProjectComment.parent_id.is_(None))
        .order_by(ProjectComment.created_at)
    ).scalars().all()
    return [_comment_read(c) for c in rows]


@router.post("/projects/{project_id}/comments", response_model=CommentRead, status_code=201)
def create_comment(project_id: int, payload: CommentCreate, db: Annotated[Session, Depends(get_db)]) -> CommentRead:
    c = ProjectComment(project_id=project_id, **payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return _comment_read(c)


@router.patch("/comments/{comment_id}", response_model=CommentRead)
def update_comment(comment_id: int, payload: CommentUpdate, db: Annotated[Session, Depends(get_db)]) -> CommentRead:
    c = db.get(ProjectComment, comment_id)
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    c.body = payload.body
    c.updated_at = datetime.now(tz=timezone.utc)
    db.commit()
    db.refresh(c)
    return _comment_read(c)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, db: Annotated[Session, Depends(get_db)]) -> None:
    c = db.get(ProjectComment, comment_id)
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(c)
    db.commit()


# ─── Client Credentials ───────────────────────────────────────────────────────

@router.get("/projects/{project_id}/credentials", response_model=CredentialRead | None)
def get_credentials(project_id: int, db: Annotated[Session, Depends(get_db)]) -> CredentialRead | None:
    cred = db.execute(
        select(ClientCredential).where(ClientCredential.project_id == project_id)
    ).scalar_one_or_none()
    return CredentialRead.model_validate(cred) if cred else None


@router.put("/projects/{project_id}/credentials", response_model=CredentialRead)
def upsert_credentials(project_id: int, payload: CredentialUpsert, db: Annotated[Session, Depends(get_db)]) -> CredentialRead:
    cred = db.execute(
        select(ClientCredential).where(ClientCredential.project_id == project_id)
    ).scalar_one_or_none()
    if cred:
        for k, v in payload.model_dump().items():
            setattr(cred, k, v)
        cred.updated_at = datetime.now(tz=timezone.utc)
    else:
        cred = ClientCredential(project_id=project_id, **payload.model_dump())
        db.add(cred)
    db.commit()
    db.refresh(cred)
    return CredentialRead.model_validate(cred)
