# CRM Guide

## Lead Lifecycle

```
Import → Lead Finder / CSV / Campaign
    ↓
Lead List (/leads)  — filter, search, sort
    ↓
Lead Detail (/leads/[id])  — full profile, call, note, qualify
    ↓
Pipeline (/pipeline)  — Kanban by contact status
    ↓
Opportunities (/opportunities)  — high-score leads ready to pitch
    ↓
Deal (/deals)  — commercial tracking
    ↓
Project (/projects)  — delivery tracking
    ↓
Client Follow-ups (/followups)  — ongoing client relationship
```

---

## Lead List

Route: `GET /businesses`

The lead list supports the following filters, all combinable:

| Filter | Values |
|--------|--------|
| Website Status | NO_WEBSITE, FACEBOOK_ONLY, FREE_BUILDER, BROKEN_WEBSITE, HAS_WEBSITE |
| Contact Status | NEW, CALLED, NO_ANSWER, INTERESTED, FOLLOW_UP, PROPOSAL_SENT, WON, LOST |
| Country | UK, Bulgaria, any string |
| City | Free text |
| Category | Free text (matches partial) |
| Has Phone | boolean |
| Has Email | boolean |
| Free Search | Searches name + address |

Leads are returned sorted by `lead_score` descending by default.

---

## Lead Detail

Route: `/leads/[id]`

The lead detail page shows all data for a single business:

**Contact panel**
- Phone (click to call via `tel:` link)
- Email (click to copy)
- Website (open in new tab)
- Social links: Facebook, Instagram, LinkedIn
- Google Maps link
- Address / city / country / category

**Pipeline panel**
- Contact status selector (8 stages)
- Deal value
- Follow-up date picker
- Proposal sent date
- Won date

**Call log**
- Log a call with outcome (Answered, No Answer, Voicemail, Busy)
- Notes per call
- History of all calls

**Notes**
- Timestamped notes history
- Add new note

**Website Intelligence**
- Website analysis signals (run on demand)
- Health score, SEO score, redesign score
- Platform, HTTPS, mobile, analytics, UX signals

**AI Intelligence**
- Opportunity score and priority
- Talking points
- Objection responses
- Opportunity report
- Recommended services

**Meeting Notes** (upsert per business)
- Summary, requirements, budget, deadline
- Decision maker name
- Next meeting date
- Competitor names mentioned

**Competitor Snapshot** (SWOT per business)
- Main competitors list
- Strengths, weaknesses, opportunities, threats

**CloudTalk**
- Sync contact button
- Initiate call button
- CloudTalk call history

---

## Pipeline (Kanban)

Route: `/pipeline`

Displays businesses grouped by `contact_status` in 8 columns. Each card shows:
- Business name
- City + category
- Lead score badge
- Deal value (if set)
- Last contacted date

Status is updated from the lead detail page.

---

## Deals

Each deal links to a business and tracks:

| Field | Description |
|-------|-------------|
| `deal_name` | Name for the deal (auto-suggested from business name) |
| `status` | OPEN, WON, LOST, ON_HOLD |
| `estimated_value` | Expected contract value |
| `probability` | % chance of winning |
| `expected_close_date` | Target close date |
| `actual_close_date` | Date deal was closed |
| `salesperson` | Name of the salesperson |
| `won_reason` | Why it was won |
| `lost_reason` | Why it was lost |

---

## Projects

Projects are linked to deals and track delivery:

| Field | Description |
|-------|-------------|
| `name` | Project name |
| `package` | Service package (e.g. "5-page website") |
| `developer` | Assigned developer |
| `designer` | Assigned designer |
| `project_manager` | Assigned PM |
| `status` | ACTIVE, PAUSED, COMPLETED, CANCELLED |
| `completion_pct` | 0–100% |
| `start_date` | Project start date |
| `expected_delivery` | Deadline |
| `total_value` | Contract value |
| `deposit` | Deposit received |
| `paid_amount` | Total paid to date |

**Project Credentials** — one set per project, stores all client access credentials securely in the database (not in files). Covers hosting, domain, WordPress, FTP, cPanel, Cloudflare, GA, GSC, GBP, social.

---

## Client Follow-ups

Client follow-ups are post-sale tasks linked to businesses (not leads). Used after a project is in delivery:

| Field | Description |
|-------|-------------|
| `follow_up_date` | Date (required) |
| `follow_up_time` | Time (optional) |
| `type` | CALL, EMAIL, MEETING, PROPOSAL, REVISION, PAYMENT, OTHER |
| `priority` | LOW, MEDIUM, HIGH, URGENT |
| `status` | PENDING, COMPLETED, CANCELLED |
| `assigned_to` | Team member name |
| `reminder_sent` | Boolean flag |

---

## Analytics

### CRM Dashboard (`/crm`)

- Total leads, opportunities by status
- Calls today, total calls
- Interested, proposals sent, deals won
- Revenue won (sum of `deal_value` where `won_at` is set)
- Revenue by month (bar chart)
- Category analytics (which categories convert)
- Market analytics (which cities perform best)
- Funnel conversion rates: Call → Interested → Proposal → Won

### Workspace (`/workspace`)

- Daily snapshot (calls, follow-ups, HOT leads, pipeline value)
- Week-over-week call comparison
- Win rate
- Funnel rates
- Top performing category
- Overdue follow-up percentage
- HOT leads list with direct call links
