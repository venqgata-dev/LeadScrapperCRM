"""Website Intelligence Engine — CMS/builder detection and health analysis from pre-fetched HTML.

Designed to work with the Enrichment Engine: the enrichment flow downloads the page once and
passes the HTML here, avoiding duplicate HTTP requests.

This module is separate from website_analyzer.py (which fetches its own URL). Both persist
to the same Business columns but serve different call paths:
  - website_analyzer.py  → called by POST /website-analysis/{id} (user-triggered, fetches URL)
  - website_analysis.py  → called by the enrichment engine (batch, reuses fetched HTML)
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CMS / Builder detection patterns
# ---------------------------------------------------------------------------

_CMS_PATTERNS: list[tuple[str, str]] = [
    # Order matters — more specific first
    ("WooCommerce",  r"(?:/woocommerce/|wc-ajax=|woocommerce-cart)"),
    ("WordPress",    r"(?:/wp-content/|/wp-includes/|wp-json|xmlrpc\.php)"),
    ("WordPress",    r'<meta[^>]+generator[^>]*content=["\'][^"\']*WordPress'),
    ("Ghost",        r"(?:ghost\.io|content/ghost|ghost-theme)"),
    ("Shopify",      r"cdn\.shopify\.com"),
    ("Wix",          r"(?:wixstatic\.com|static\.parastorage\.com|wix\.com/lpviral)"),
    ("Squarespace",  r"squarespace\.com"),
    ("Webflow",      r"(?:webflow\.io|assets-global\.website-files\.com|\.webflow\.com)"),
    ("Joomla",       r"(?:/media/jui/|<meta[^>]+generator[^>]*Joomla)"),
    ("Drupal",       r"(?:/sites/(?:default|all)/(?:modules|themes)/|<meta[^>]+generator[^>]*Drupal)"),
    ("Magento",      r"(?:Mage\.Cookies|/skin/frontend/|varien/js\.js)"),
    ("PrestaShop",   r"(?:prestashop|/themes/classic/)"),
    ("OpenCart",     r"(?:route=common/home|catalog/view/theme)"),
]

_BUILDER_PATTERNS: list[tuple[str, str]] = [
    ("Elementor",     r"(?:elementor-|data-elementor|elementor\.com)"),
    ("Divi",          r"et_pb_"),
    ("Beaver Builder",r"fl-builder"),
    ("WPBakery",      r"vc_row"),
    ("Gutenberg",     r"wp-block-"),
    ("Brizy",         r"brz-"),
    ("Oxygen",        r"oxygen-"),
]

_COMPILED_CMS: list[tuple[str, re.Pattern[str]]] = [
    (name, re.compile(pat, re.IGNORECASE | re.DOTALL)) for name, pat in _CMS_PATTERNS
]
_COMPILED_BUILDER: list[tuple[str, re.Pattern[str]]] = [
    (name, re.compile(pat, re.IGNORECASE | re.DOTALL)) for name, pat in _BUILDER_PATTERNS
]

_GENERATOR_RE = re.compile(
    r'<meta[^>]+name=["\']generator["\'][^>]+content=["\']([^"\']+)["\']'
    r'|<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']generator["\']',
    re.IGNORECASE,
)
_LANG_RE = re.compile(r'<html[^>]+lang=["\']([^"\']+)["\']', re.IGNORECASE)
_CONTACT_FORM_RE = re.compile(
    r'(?:wpcf7|gform_|wpforms|contact.?form|name=["\']message["\']'
    r'|<input[^>]+type=["\']email["\']|<form[^>]+(?:contact|enquir|message))',
    re.IGNORECASE,
)
_FAVICON_RE = re.compile(
    r'<link[^>]+rel=["\'][^"\']*icon[^"\']*["\']', re.IGNORECASE
)
_VIEWPORT_RE = re.compile(
    r'<meta[^>]+name=["\']viewport["\']', re.IGNORECASE
)
_DESC_RE = re.compile(
    r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']'
    r'|<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']',
    re.IGNORECASE,
)
_TITLE_RE = re.compile(r'<title[^>]*>([^<]+)</title>', re.IGNORECASE)
_H1_RE = re.compile(r'<h1[^>]*>([^<]+)</h1>', re.IGNORECASE)
_OG_RE = re.compile(r'<meta[^>]+property=["\']og:', re.IGNORECASE)
_ANALYTICS_MARKERS = (
    "gtag(", "google-analytics.com", "googletagmanager.com", "GTM-",
    "fbq(", "connect.facebook.net/en_US/fbevents.js",
)


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class WebsiteIntelligence:
    url: str
    # CMS / Builder
    cms: str | None = None
    builder: str | None = None
    wordpress: bool = False
    elementor: bool = False
    shopify: bool = False
    wix: bool = False
    squarespace: bool = False
    webflow: bool = False
    # Meta
    generator: str | None = None
    language: str | None = None
    title: str | None = None
    ssl: bool = False
    mobile_friendly: bool = False
    has_contact_form: bool = False
    has_meta_description: bool = False
    has_favicon: bool = False
    has_analytics: bool = False
    has_og: bool = False
    # Text content
    description: str | None = None
    h1: str | None = None
    # Performance
    load_time_ms: int = 0
    page_size: int = 0
    # Scores
    health_score: int = 0
    redesign_score: int = 0
    seo_score: int = 0
    notes: str = ""
    error: str | None = None


# ---------------------------------------------------------------------------
# Detection functions
# ---------------------------------------------------------------------------

def detect_cms(html: str) -> str | None:
    """Identify the CMS powering this website."""
    for name, pattern in _COMPILED_CMS:
        if pattern.search(html):
            return name
    return None


def detect_builder(html: str) -> str | None:
    """Identify the page builder used on this website."""
    for name, pattern in _COMPILED_BUILDER:
        if pattern.search(html):
            return name
    return None


def _extract_generator(html: str) -> str | None:
    m = _GENERATOR_RE.search(html)
    if m:
        return (m.group(1) or m.group(2) or "").strip()[:255] or None
    return None


def _extract_language(html: str) -> str | None:
    m = _LANG_RE.search(html)
    return m.group(1).strip()[:10] if m else None


def _extract_title(html: str) -> str | None:
    m = _TITLE_RE.search(html)
    if m:
        t = re.sub(r"\s+", " ", m.group(1)).strip()[:255]
        return t or None
    return None


def _extract_description(html: str) -> str | None:
    m = _DESC_RE.search(html)
    if m:
        d = (m.group(1) or m.group(2) or "").strip()[:500]
        return d or None
    return None


def _extract_h1(html: str) -> str | None:
    m = _H1_RE.search(html)
    if m:
        h = re.sub(r"\s+", " ", m.group(1)).strip()[:255]
        return h or None
    return None


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def calculate_health_score(wi: WebsiteIntelligence) -> int:
    s = 0
    if wi.ssl:             s += 20
    if wi.mobile_friendly: s += 20
    load_s = wi.load_time_ms / 1000
    if 0 < load_s <= 5.0:  s += 15
    if wi.has_favicon:     s += 10
    if wi.has_analytics:   s += 15
    if wi.page_size > 0 and wi.page_size <= 300_000: s += 10
    if wi.h1:              s += 5
    if wi.title:           s += 5
    return min(100, s)


def calculate_redesign_score(wi: WebsiteIntelligence) -> int:
    s = 0
    if not wi.ssl:               s += 25
    if not wi.mobile_friendly:   s += 20
    if not wi.has_meta_description: s += 15
    if not wi.h1:                s += 10
    if not wi.has_og:            s += 10
    load_s = wi.load_time_ms / 1000
    if load_s > 5.0:             s += 15
    if wi.page_size > 500_000:   s += 10
    if not wi.has_favicon:       s += 5
    if not wi.has_contact_form:  s += 5
    # Very thin page
    text = re.sub(r"<[^>]+>", "", "").strip()
    return min(100, s)


def _calc_seo_score(wi: WebsiteIntelligence) -> int:
    s = 0
    if wi.title:               s += 15
    if wi.has_meta_description: s += 15
    if wi.h1:                  s += 10
    if wi.mobile_friendly:     s += 10
    if wi.has_og:              s += 10
    if wi.ssl:                 s += 15
    if wi.has_favicon:         s += 5
    if wi.has_analytics:       s += 10
    if wi.has_contact_form:    s += 10
    return min(100, s)


def _build_notes(wi: WebsiteIntelligence) -> str:
    issues: list[str] = []
    if not wi.ssl:                issues.append("Not HTTPS")
    if not wi.mobile_friendly:    issues.append("No viewport meta")
    if not wi.title:              issues.append("Missing title")
    if not wi.has_meta_description: issues.append("No meta description")
    if not wi.h1:                 issues.append("Missing H1")
    if not wi.has_og:             issues.append("No Open Graph tags")
    if not wi.has_favicon:        issues.append("No favicon")
    if not wi.has_contact_form:   issues.append("No contact form detected")
    if wi.load_time_ms > 5000:    issues.append(f"Slow ({wi.load_time_ms}ms)")
    if wi.page_size > 500_000:    issues.append(f"Large page ({wi.page_size // 1000}KB)")
    return "; ".join(issues) if issues else "No major issues"


# ---------------------------------------------------------------------------
# Main entry point — analyze pre-fetched HTML
# ---------------------------------------------------------------------------

def analyze_homepage(url: str, html: str, load_time_ms: int = 0, page_size: int = 0) -> WebsiteIntelligence:
    """Analyze a website from pre-fetched HTML. Never makes HTTP requests."""
    parsed = urlparse(url)
    wi = WebsiteIntelligence(
        url=url,
        ssl=parsed.scheme == "https",
        load_time_ms=load_time_ms,
        page_size=page_size,
    )

    try:
        wi.cms = detect_cms(html)
        wi.builder = detect_builder(html)

        # Platform-specific booleans
        wi.wordpress = bool(wi.cms in ("WordPress", "WooCommerce"))
        wi.elementor = bool(wi.builder == "Elementor")
        wi.shopify = bool(wi.cms == "Shopify")
        wi.wix = bool(wi.cms == "Wix")
        wi.squarespace = bool(wi.cms == "Squarespace")
        wi.webflow = bool(wi.cms == "Webflow")

        # Meta
        wi.generator = _extract_generator(html)
        wi.language = _extract_language(html)
        wi.title = _extract_title(html)
        wi.description = _extract_description(html)
        wi.h1 = _extract_h1(html)

        wi.mobile_friendly = bool(_VIEWPORT_RE.search(html))
        wi.has_favicon = bool(_FAVICON_RE.search(html))
        wi.has_meta_description = bool(wi.description)
        wi.has_contact_form = bool(_CONTACT_FORM_RE.search(html))
        wi.has_og = bool(_OG_RE.search(html))
        wi.has_analytics = any(m in html for m in _ANALYTICS_MARKERS)

        wi.health_score = calculate_health_score(wi)
        wi.redesign_score = calculate_redesign_score(wi)
        wi.seo_score = _calc_seo_score(wi)
        wi.notes = _build_notes(wi)

    except Exception as exc:
        logger.warning("Website intelligence analysis failed for %s: %s", url, exc)
        wi.error = str(exc)[:255]

    return wi
