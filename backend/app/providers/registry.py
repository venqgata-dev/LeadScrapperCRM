from collections.abc import Callable

from app.core.config import Settings, get_settings
from app.providers.base import LeadProvider, LeadProviderError
from app.providers.cylex import CylexProvider
from app.providers.freeindex import FreeIndexProvider
from app.providers.google_maps import GoogleMapsProvider
from app.providers.outscraper import OutscraperProvider
from app.providers.thomson_local import ThomsonLocalProvider
from app.providers.yell import YellProvider

ProviderFactory = Callable[[Settings], LeadProvider]


def _build_registry() -> dict[str, ProviderFactory]:
    return {
        OutscraperProvider.source: lambda settings: OutscraperProvider(settings),
        YellProvider.source: lambda settings: YellProvider(),
        GoogleMapsProvider.source: lambda settings: GoogleMapsProvider(settings),
        ThomsonLocalProvider.source: lambda settings: ThomsonLocalProvider(),
        CylexProvider.source: lambda settings: CylexProvider(),
        FreeIndexProvider.source: lambda settings: FreeIndexProvider(),
    }


def get_lead_provider(source: str) -> LeadProvider:
    normalized_source = source.strip().casefold()
    registry = _build_registry()
    provider_factory = registry.get(normalized_source)
    if provider_factory is None:
        supported_sources = ", ".join(sorted(registry))
        raise LeadProviderError(
            f"Unsupported lead provider '{source}'. Supported sources: {supported_sources}."
        )
    return provider_factory(get_settings())
