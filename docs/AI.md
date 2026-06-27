# AI & Intelligence

## Overview

LeadScrapper uses AI at two levels:

1. **Rule-based scoring** — deterministic signals from website analysis (no external API, instant)
2. **LLM-generated content** — talking points, objection handling, opportunity reports (requires OpenAI)

---

## Lead Scoring (Rule-based)

**File:** `services/businesses.py` — `calculate_lead_score()`

Every imported business receives a `lead_score` (0–100) without any external API call. The score is recalculated when website analysis runs.

| Signal | Score Impact |
|--------|-------------|
| No website | +40 |
| Facebook-only | +30 |
| Free website builder | +25 |
| Broken website | +20 |
| Redesign score ≥ 60 | +40 (via analysis) |
| SEO score < 50 | +20 (via analysis) |
| No HTTPS | +15 (via analysis) |
| Not mobile-friendly | +20 (via analysis) |
| Has phone number | +5 |
| Has Google Maps URL | +5 |

Score is capped at 100. Score ≥ 70 = opportunity.

---

## Website Analyzer (Rule-based)

**File:** `services/website_analyzer.py`

Fetches the business homepage with `httpx` (10s timeout, 500KB cap) and extracts 30+ signals using `BeautifulSoup`.

### Detection logic

**Platform detection** — checks for known CMS fingerprints in HTML, meta tags, script sources, CSS paths:
- WordPress: `/wp-content/`, `wp-json`, generator tag
- Wix: `static.wixstatic.com`, `X-Wix-Meta-Site-Id`
- Shopify: `cdn.shopify.com`, `Shopify.theme`
- Squarespace: `static1.squarespace.com`
- Webflow: `assets.website-files.com`
- GoDaddy: `cdn1.bigcommerce.com` / `godaddysites.com`

**Computed scores:**

```python
seo_score = weighted average of:
  has_title (20) + has_meta_desc (20) + has_h1 (15) +
  has_sitemap (15) + has_robots (10) + has_lang (10) + load_time_ok (10)

redesign_score = weighted average of:
  is_old_platform (25) + low_health (20) + no_https (20) +
  not_mobile (15) + no_analytics (10) + high_load_time (10)

health_score = weighted average of:
  has_https (20) + is_mobile (15) + has_analytics (15) +
  has_meta_desc (15) + seo_score_contribution (15) + load_time (10) + has_title (10)
```

### Advanced signals (Milestone 30)

| Signal | How detected |
|--------|-------------|
| Cookie banner | Detects CookieBot, OneTrust, GDPR text, cookie class names |
| Live chat | Tawk.to, Crisp, Intercom, Zendesk, LiveChat script URLs |
| Booking system | Calendly, Booksy, SimplyBook, Acuity, Setmore embed/link |
| WhatsApp button | `wa.me` links, WhatsApp widget scripts |
| Google Maps embed | `maps.google.com` iframe |
| Outdated libraries | jQuery 1.x/2.x, Bootstrap 2/3, AngularJS in script tags |
| Analytics tools | GTM, GA4, UA, FB Pixel, Hotjar, Clarity, Segment, Mixpanel |
| CMS version | WordPress version from `<meta name="generator">` |

---

## AI Opportunity Engine (LLM)

**File:** `services/sales_ai.py`

Requires `OPENAI_API_KEY`. Generates human-readable sales intelligence for each business.

### Functions

**`generate_insight(business, db)`**
Main entry point. Computes all sub-scores, calls LLM functions, stores result in `sales_insights` table.

**`generate_talking_points(business)`**
Returns 6 talking points tailored to the specific business's website/social gaps.

Example output:
```
- "Your competitors in [city] are getting 40% more enquiries with a mobile-friendly site"
- "Your current site isn't indexed by Google — you're invisible to search"
- "We can get you a professional site live in 14 days for under £1,200"
```

**`generate_objection_responses(business)`**
Returns pre-prepared responses to common sales objections:

| Objection | Personalised response |
|-----------|----------------------|
| "Too expensive" | Anchored to their specific situation |
| "Not interested" | Reframe with a specific pain point |
| "I have someone" | Qualify and differentiate |
| "Call back later" | Create urgency |
| "Send me an email" | Soft close |
| "Already tried that" | Address the specific failure |

**`generate_opportunity_report(business)`**
Returns a structured dict:
```json
{
  "score": 87,
  "priority": "HOT",
  "website_health": "Poor — no HTTPS, not mobile-friendly",
  "redesign_effort": "Medium — 3–4 weeks",
  "value_range": "£1,200 – £2,500",
  "issues_count": 7,
  "top_issues": ["No website", "No Google presence", "Facebook-only"]
}
```

---

## Sales Playbooks

**File:** `models/playbook.py`, `api/v1/playbooks.py`

12 default playbooks are seeded in migration `202607070001`. Each covers a specific business type.

Playbook structure:
```json
{
  "name": "Plumbers & Heating Engineers",
  "applies_to": ["Plumbers", "Heating Engineers", "Boiler Repair"],
  "opening": "Hi, I'm calling from [Agency] — I specialise in websites for trades in [City]...",
  "questions": [
    "Do you find customers mostly call you directly or do they search Google first?",
    "Are you getting enough new enquiries, or does it feel like you could do with more work?"
  ],
  "pain_points": [
    "Most people Google 'emergency plumber [city]' — without a website you're invisible",
    "Your competitors with websites get 3× more enquiries"
  ],
  "closing": "I'd like to show you 3 examples of sites we've built for plumbers in your area...",
  "objection_handling": {
    "Too expensive": "We have a payment plan — £300 deposit and £100/month for 12 months",
    "I already have a Facebook page": "Facebook is great, but Google searchers don't check Facebook"
  }
}
```

Default playbooks (`is_default: true`) cannot be deleted, only edited.
