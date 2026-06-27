# API Reference

Base URL: `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs` (Swagger UI)

All endpoints return JSON. Errors follow the format:
```json
{ "detail": "Human-readable error message" }
```

---

## Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{"status":"ok"}` |

---

## Businesses

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/businesses` | List businesses with filters |
| `GET` | `/businesses/{id}` | Get single business |
| `PATCH` | `/businesses/{id}` | Update contact status, deal value, notes, dates |
| `GET` | `/businesses/stats` | CRM dashboard KPIs |
| `GET` | `/businesses/opportunities/no-website` | Businesses without websites |
| `GET` | `/businesses/analytics/revenue-by-month` | Monthly revenue data |
| `GET` | `/businesses/analytics/categories` | Category analytics |
| `GET` | `/businesses/analytics/markets` | City/market analytics |
| `POST` | `/businesses/{id}/calls` | Log a call |
| `GET` | `/businesses/{id}/calls` | List call logs |
| `POST` | `/businesses/{id}/notes` | Add a note |
| `GET` | `/businesses/{id}/notes` | List notes |
| `POST` | `/businesses/{id}/discover-email` | Scrape website for contact email |
| `GET` | `/businesses/{id}/sales-insights` | AI opportunity insights |
| `GET` | `/businesses/{id}/meeting-notes` | Get meeting notes |
| `PUT` | `/businesses/{id}/meeting-notes` | Create or update meeting notes |
| `GET` | `/businesses/{id}/competitor` | Get competitor snapshot |
| `PUT` | `/businesses/{id}/competitor` | Create or update competitor SWOT |

### GET /businesses — Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Name/address full-text search |
| `website_status` | enum | `NO_WEBSITE`, `FACEBOOK_ONLY`, `FREE_BUILDER`, `BROKEN_WEBSITE`, `HAS_WEBSITE` |
| `contact_status` | enum | `NEW`, `CALLED`, `NO_ANSWER`, `INTERESTED`, `FOLLOW_UP`, `PROPOSAL_SENT`, `WON`, `LOST` |
| `country` | string | Filter by country |
| `city` | string | Filter by city |
| `category` | string | Filter by category |
| `has_phone` | bool | Only leads with a phone number |
| `has_email` | bool | Only leads with an email |

---

## Search / Lead Finder

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/search` | Search for leads without importing |
| `POST` | `/import-batch` | Import a batch of `SearchResultLead` objects |
| `POST` | `/import-csv` | Import from CSV file upload |
| `POST` | `/preview-csv` | Preview CSV without importing |
| `POST` | `/import-leads` | Import via provider keyword search |
| `GET` | `/providers` | List available scrapers and their status |

### POST /search — Body

```json
{
  "country": "UK",
  "city": "Manchester",
  "category": "Plumbers",
  "provider": "google_maps",
  "expand_keywords": true,
  "expand_neighbors": false,
  "radius_km": 0
}
```

---

## Campaigns

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/campaigns` | List all campaigns |
| `POST` | `/campaigns` | Create a campaign |
| `GET` | `/campaigns/{id}` | Get campaign (includes live progress) |
| `DELETE` | `/campaigns/{id}` | Delete a campaign |
| `GET` | `/campaigns/stats` | Aggregate campaign statistics |
| `POST` | `/campaigns/check-duplicate` | Check if similar campaign exists |
| `POST` | `/campaigns/{id}/start` | Start campaign (runs in background) |
| `POST` | `/campaigns/{id}/pause` | Pause a running campaign |
| `POST` | `/campaigns/{id}/resume` | Resume a paused campaign |
| `POST` | `/campaigns/{id}/cancel` | Cancel a campaign |

---

## Sales Playbooks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/playbooks` | List playbooks (`?active_only=true`) |
| `POST` | `/playbooks` | Create a new playbook |
| `PUT` | `/playbooks/{id}` | Update a playbook |
| `DELETE` | `/playbooks/{id}` | Delete a non-default playbook |

---

## Workspace

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/workspace/stats` | Daily KPIs and manager dashboard data |
| `GET` | `/workspace/hot-leads` | Top HOT-priority leads by AI score |

---

## CloudTalk

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cloudtalk/status` | Check CloudTalk connection |
| `POST` | `/cloudtalk/test` | Test connection and return account info |
| `POST` | `/cloudtalk/sync-contact/{id}` | Sync business to CloudTalk contacts |
| `POST` | `/cloudtalk/call/{id}` | Initiate an outbound call |
| `GET` | `/cloudtalk/calls/{id}` | Get CloudTalk call history for a business |

---

## Common Response Shapes

### Business

```json
{
  "id": 1,
  "name": "ABC Plumbing",
  "phone": "+44 7911 123456",
  "email": "info@abcplumbing.co.uk",
  "website": null,
  "website_status": "NO_WEBSITE",
  "contact_status": "NEW",
  "lead_score": 87,
  "ai_score": 92,
  "ai_priority": "HOT",
  "ai_project_value": 2500,
  "city": "Manchester",
  "country": "UK",
  "category": "Plumbers",
  "deal_value": null,
  "created_at": "2026-06-15T10:00:00Z",
  "updated_at": "2026-06-27T14:30:00Z"
}
```

### CRM Dashboard Stats

```json
{
  "total_opportunities": 412,
  "no_website": 198,
  "facebook_only": 87,
  "free_builder": 43,
  "total_calls": 156,
  "calls_today": 8,
  "interested": 23,
  "proposals_sent": 7,
  "deals_won": 4,
  "revenue_won": 12500.00,
  "win_rate": 2.56,
  "call_to_interested_rate": 14,
  "interested_to_proposal_rate": 30,
  "proposal_to_won_rate": 57
}
```

### Workspace Stats

```json
{
  "calls_today": 5,
  "follow_ups_today": 3,
  "follow_ups_overdue": 1,
  "hot_leads": 12,
  "in_negotiation": 4,
  "proposals_waiting": 2,
  "total_pipeline_value": 18500.0,
  "calls_this_week": 23,
  "win_rate": 12.5,
  "top_category": "Plumbers"
}
```
