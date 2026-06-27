from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.errors import db_error_handler
from app.db.session import get_db
from app.models.sales_insight import SalesInsight
from app.schemas.sales_insight import SalesInsightRead

router = APIRouter()


@router.get("/businesses/{business_id}/sales-insights", response_model=SalesInsightRead | None)
@db_error_handler("get sales insights")
def get_sales_insights(business_id: int, db: Annotated[Session, Depends(get_db)]) -> SalesInsightRead | None:
    return db.query(SalesInsight).filter(SalesInsight.business_id == business_id).first()
