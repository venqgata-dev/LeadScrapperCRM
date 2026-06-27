# Features Reference

## Lead Generation

### Google Maps Search

Uses the Google Maps Places API (New) text search. Searches by city + category + optional keyword expansion. Supports UK and Bulgaria with localized category names.

- Up to 60 results per city search
- Language-aware results (`languageCode` param)
- Configurable import limit (`GOOGLE_MAPS_IMPORT_LIMIT`)

### Yell.com Scraper

BeautifulSoup-based scraper of yell.com directory pages. Extracts business name, phone, address, website, category. Supports up to 4 result pages per search.

### FreeIndex Scraper

UK business directory scraper. URL construction requires a literal `!` character in the query string — handled via string concatenation, not `urllib`.

### CSV Import

Upload a CSV file with business data. The system:
1. Validates headers and encoding (UTF-8 with BOM support)
2. Classifies each row (website status detection)
3. Deduplicates against existing records (name + phone + address)
4. Returns counts: imported / updated / skipped

Preview mode (`/preview-csv`) runs the same pipeline without writing to the database.

### Keyword Expansion

For each category, the system generates related search terms. For example, searching "Plumbers" also searches "emergency plumber", "boiler repair", "heating engineer", etc. Controlled by `expand_keywords` flag.

### Neighbor City Expansion

Given a city, the system can automatically add surrounding cities within a radius. City lists are pre-defined per country in `providers/neighbors.py`. Controlled by `expand_neighbors` flag.

---

## Lead Scoring

Each business gets a `lead_score` (0–100) based on:

| Signal | Points |
|--------|--------|
| No website at all | +40 |
| Facebook-only presence | +30 |
| Free website builder (Wix, Weebly, etc.) | +25 |
| Broken/unreachable website | +20 |
| Low redesign score (from analyzer) | +15 |
| No HTTPS | +15 |
| Not mobile friendly | +20 |
| Low SEO score | +20 |
| Has phone number | +5 |
| Has Google Maps listing | +5 |

Leads with score ≥ 70 are opportunities. All leads are imported; score determines display priority.

---

## Campaign Manager

Named search campaigns that run in the background. Each campaign defines:
- Country, category, list of cities
- Provider (google_maps, yell, etc.)
- Keyword expansion on/off
- Neighbor expansion on/off
- Auto-import results on/off

Campaigns can be paused and resumed mid-run. Progress is tracked per city and stored in `progress_data` JSON. The UI polls the API every 3 seconds while status is `Running`.

Duplicate detection warns if a similar campaign (same country + category + overlapping cities) already exists.

---

## CRM

### Lead List

Filterable table of all imported businesses. Filters include:
- Website status (NO_WEBSITE, FACEBOOK_ONLY, FREE_BUILDER, BROKEN_WEBSITE, HAS_WEBSITE)
- Contact status (8 stages)
- Country, city, category
- Has phone / has email
- AI score range, AI priority
- Free-text search (name + address)

### Pipeline

Kanban board view of leads by contact status. Drag is not implemented — status is changed on the lead detail page.

### Lead Detail

Full profile page for a single business with:
- Contact information (phone, email, website, social links)
- Website intelligence signals
- AI opportunity scoring
- Sales talking points and objection responses
- Call log with outcomes
- Notes history
- Follow-up scheduling
- CloudTalk call initiation

### Contact Statuses

| Status | Meaning |
|--------|---------|
| `NEW` | Just imported, not yet contacted |
| `CALLED` | Call made, no meaningful response yet |
| `NO_ANSWER` | Called, no one picked up |
| `INTERESTED` | Prospect expressed interest |
| `FOLLOW_UP` | Scheduled follow-up pending |
| `PROPOSAL_SENT` | Proposal/quote sent |
| `WON` | Deal closed |
| `LOST` | Prospect declined |

---

## Website Intelligence

### Website Analyzer

The analyzer (`services/website_analyzer.py`) fetches the business homepage with `httpx` and parses it with `BeautifulSoup`. It caps pages at 500KB and runs synchronously.

**Detected signals:**

| Category | Signals |
|----------|---------|
| Platform | WordPress, Wix, Shopify, Squarespace, Webflow, GoDaddy, Weebly, Joomla, Drupal, Magento, OpenCart, Elementor |
| SEO | Title, meta description, H1 count, sitemap.xml, robots.txt |
| Performance | Page size, load time, HTTPS |
| Mobile | Viewport meta tag |
| Analytics | GTM, GA4, Facebook Pixel, Hotjar, Microsoft Clarity, Segment |
| UX | Cookie banner, live chat, booking system, WhatsApp button, Google Maps embed |
| Technical | CMS version (WordPress), outdated libraries (jQuery 1/2, Bootstrap 2/3, AngularJS) |
| Accessibility | Missing alt text count, broken images count |

**Computed scores:**

| Score | Range | Description |
|-------|-------|-------------|
| `website_health_score` | 0–100 | Overall website quality |
| `website_seo_score` | 0–100 | SEO signal completeness |
| `website_redesign_score` | 0–100 | How urgently a redesign is needed (higher = more urgent) |

---

## AI Sales Intelligence

### Opportunity Score

The `sales_insights` table stores a composite AI score per business, computed from sub-scores:

| Sub-score | Weight |
|-----------|--------|
| `website_score` | Website quality signals |
| `seo_score` | SEO completeness |
| `trust_score` | Reviews, HTTPS, contact info |
| `contact_score` | Reachability (phone, email, form) |
| `social_score` | Social media presence |
| `opportunity_score` | Gap between current site and ideal |

The overall score determines `priority`: HOT (≥80), WARM (50–79), COLD (<50).

### AI-Generated Content

Powered by OpenAI:
- **Talking points** — 6 sales points specific to the business's website/social gaps
- **Objection handling** — responses to "too expensive", "not interested", "have a guy", etc.
- **Opportunity report** — structured brief: issues, redesign effort, value range
- **Recommended services** — what to pitch (new site, SEO, speed, mobile, etc.)
- **Next best action** — single recommended step

---

## Sales Playbooks

12 built-in playbooks covering common business types (Plumbers, Restaurants, Hair Salons, etc.). Each playbook contains:
- Opening line
- Discovery questions
- Pain points to highlight
- Closing statement
- Objection handling pairs

Playbooks are fully editable. Default playbooks cannot be deleted.

---

## Daily Workspace

The workspace page shows a real-time daily ops view:
- Calls made today
- Follow-ups due today (red if overdue)
- Won / Lost today
- HOT leads count
- Leads in negotiation
- Proposals waiting
- Total pipeline value

The Manager Dashboard section shows week-over-week call volume, win rate, funnel conversion rates, and top performing category.

---

## Deals & Projects

**Deals** track the commercial side of closed or in-progress sales:
- Status: OPEN, WON, LOST, ON_HOLD
- Estimated value, probability, expected close date
- Won/lost reason

**Projects** are linked to deals and track delivery:
- Developer, designer, project manager assignment
- Completion percentage
- Financial: total value, deposit, amount paid
- Start date, expected delivery

**Project Credentials** securely stores all client access:
- Hosting (provider, URL, username, password)
- Domain (registrar, expiry)
- WordPress (admin URL, user, pass)
- FTP / cPanel / Cloudflare
- Google Analytics, Search Console, Google Business Profile

---

## Client Follow-ups

Structured follow-up tasks linked to businesses:
- Follow-up date and time
- Type: Call, Email, Meeting, Proposal, Other
- Priority: LOW, MEDIUM, HIGH, URGENT
- Status: PENDING, COMPLETED, CANCELLED
- Assignment to team member
- Reminder flag

---

## CloudTalk Integration

CloudTalk is a cloud VoIP platform. Integration uses their REST API:
- Base URL: `https://my.cloudtalk.io/api`
- Auth: HTTP Basic with `ACCESS_KEY_ID:ACCESS_KEY_SECRET`
- All endpoints end in `.json`

**Flow:**
1. User clicks "Call" on a lead
2. System looks up or creates a CloudTalk contact by phone number
3. System calls `POST /calls/create.json` with agent ID and phone number
4. CloudTalk rings the agent's softphone, then connects to the prospect
5. Call record is stored in `cloudtalk_calls` with status `INITIATED`
6. Future: webhook updates call status, duration, and recording URL
