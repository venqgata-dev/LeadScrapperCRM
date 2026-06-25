from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass(frozen=True)
class ProviderLead:
    name: str
    phone: str | None = None
    website: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    category: str | None = None
    rating: Decimal | None = None
    review_count: int = 0
    google_maps_url: str | None = None
    email: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    linkedin_url: str | None = None


class LeadProvider(Protocol):
    source: str

    def search(self, keyword: str, location: str) -> list[ProviderLead]:
        """Search for leads from the provider."""


class LeadProviderError(RuntimeError):
    pass


class LeadProviderNotImplementedError(LeadProviderError):
    pass
