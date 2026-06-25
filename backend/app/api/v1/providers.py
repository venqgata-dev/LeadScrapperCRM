from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter()


class ProviderStatus(BaseModel):
    source: str
    label: str
    available: bool
    note: str


@router.get("/providers", response_model=list[ProviderStatus])
def list_providers() -> list[ProviderStatus]:
    settings = get_settings()
    return [
        ProviderStatus(
            source="yell",
            label="Yell.com",
            available=True,
            note="Free — scrapes yell.com UK directory. UK locations only.",
        ),
        ProviderStatus(
            source="google_maps",
            label="Google Maps",
            available=bool(settings.google_maps_api_key),
            note=(
                "Requires GOOGLE_MAPS_API_KEY. Free tier: $200/month credit (~1,000 searches). "
                "Works for UK and Bulgaria."
                if not settings.google_maps_api_key
                else "Configured — works for UK and Bulgaria."
            ),
        ),
        ProviderStatus(
            source="outscraper",
            label="Outscraper",
            available=bool(settings.outscraper_api_key),
            note=(
                "Requires OUTSCRAPER_API_KEY (paid service)."
                if not settings.outscraper_api_key
                else "Configured."
            ),
        ),
    ]
