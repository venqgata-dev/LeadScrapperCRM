from typing import Literal

from fastapi import APIRouter

from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> dict[str, Literal["ok"]]:
    return {"status": "ok"}
