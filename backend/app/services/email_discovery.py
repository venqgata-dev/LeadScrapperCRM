"""Discover an email address from a business website.

Tries the homepage first, then common contact-page paths.
Returns (email, source_label) or (None, None) on failure.
"""
from __future__ import annotations

import logging
import re
from urllib.parse import urljoin, urlparse

import httpx

logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
)

# Patterns that are almost never real contact emails
_SKIP_DOMAINS = frozenset([
    "example.com", "sentry.io", "wixpress.com", "squarespace.com",
    "wordpress.com", "shopify.com", "w3.org", "schema.org",
])
_SKIP_PREFIXES = ("noreply", "no-reply", "donotreply", "mailer-daemon",
                  "bounce", "postmaster", "webmaster", "info@sentry")

_CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us", "/get-in-touch"]

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
}


def _extract_email(html: str) -> str | None:
    for match in _EMAIL_RE.findall(html):
        email = match.lower()
        domain = email.split("@", 1)[1]
        if domain in _SKIP_DOMAINS:
            continue
        if any(email.startswith(p) for p in _SKIP_PREFIXES):
            continue
        return email
    return None


def _fetch(url: str, timeout: float = 8.0) -> str | None:
    try:
        r = httpx.get(url, headers=_HEADERS, timeout=timeout, follow_redirects=True)
        if r.status_code == 200:
            return r.text
    except Exception:
        pass
    return None


def _normalise_base(website: str) -> str:
    """Ensure URL has a scheme."""
    if not website.startswith(("http://", "https://")):
        website = "https://" + website
    return website.rstrip("/")


def discover_email(website: str) -> tuple[str | None, str | None]:
    """Return (email, source) where source is a human-readable label."""
    base = _normalise_base(website)

    # 1 — homepage
    html = _fetch(base)
    if html:
        email = _extract_email(html)
        if email:
            return email, "homepage"

    # 2 — contact / about pages
    for path in _CONTACT_PATHS:
        url = base + path
        html = _fetch(url)
        if html:
            email = _extract_email(html)
            if email:
                label = path.strip("/").replace("-", " ")  # e.g. "contact us"
                return email, label

    return None, None
