"""
Cylex UK business directory provider.

Cylex UK (cylex-uk.co.uk) is protected by Cloudflare WAF and blocks all
requests from datacenter / container IPs with HTTP 403. This provider raises
a clear error message so the user understands why results are unavailable.

If you need Cylex data, run the scraper from a residential IP or use
Google Maps (API key required) instead.
"""
import logging

from app.providers.base import LeadProviderError, ProviderLead

logger = logging.getLogger(__name__)


class CylexProvider:
    source = "cylex"

    def search(self, keyword: str, location: str) -> list[ProviderLead]:
        raise LeadProviderError(
            "Cylex UK (cylex-uk.co.uk) is protected by Cloudflare and blocks "
            "all requests from datacenter or container IPs (HTTP 403). "
            "Use Google Maps (requires an API key) or CSV import instead."
        )
