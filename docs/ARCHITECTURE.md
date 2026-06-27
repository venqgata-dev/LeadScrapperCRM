# Architecture

## Overview

LeadScrapper is a monolithic full-stack application split into a Python backend and a Next.js frontend, connected via a REST API, backed by PostgreSQL, and containerised with Docker Compose.

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│              Next.js 16 (App Router)                │
│         TypeScript · Tailwind CSS · React 18        │
└──────────────────────┬──────────────────────────────┘
                       │ REST / JSON
                       │ http://localhost:8000
┌──────────────────────▼──────────────────────────────┐
│                   FastAPI                           │
│         Python 3.12 · SQLAlchemy 2.0               │
│     api/v1/ · services/ · models/ · schemas/        │
└──────────────────────┬──────────────────────────────┘
                       │ SQLAlchemy ORM
┌──────────────────────▼──────────────────────────────┐
│                  PostgreSQL 16                      │
│   26 tables · Alembic migrations (additive only)    │
└─────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Request lifecycle

```
HTTP Request
  → FastAPI Router  (api/v1/*.py)
    → Service layer  (services/*.py)
      → ORM query    (models/*.py)
        → PostgreSQL
      ← ORM object
    ← Pydantic schema validation (schemas/*.py)
  ← JSON Response
```

### Layer responsibilities

| Layer | Location | Responsibility |
|-------|----------|---------------|
| **Routers** | `api/v1/` | HTTP routing, request validation, response serialisation. No business logic. |
| **Services** | `services/` | All business logic, DB queries, external API calls. Pure functions where possible. |
| **Models** | `models/` | SQLAlchemy ORM table definitions (Mapped[] style). |
| **Schemas** | `schemas/` | Pydantic v2 models for request/response shapes. |
| **Providers** | `providers/` | Scraper integrations (Google Maps, Yell, FreeIndex, etc.). |
| **Core** | `core/` | Config (pydantic-settings), enums, error handling utilities. |
| **DB** | `db/` | SQLAlchemy session factory, Base, model registry. |

### Key design rules

- Routers are thin — they delegate to services. No SQL in routers.
- Migrations are **additive only** — never drop columns or tables.
- New nullable columns use `nullable=True`.
- JSON columns use `Mapped[list] = mapped_column(sa.JSON(), ...)`.
- One-per-business records (meeting notes, competitor snapshot) use an **upsert** pattern: `GET` returns `null` if missing, `PUT` creates or replaces.
- DB errors are caught with `@db_error_handler()` from `core/errors.py` and converted to HTTP 503.

---

## Frontend Architecture

### Request lifecycle

```
Page Component
  → lib/api.ts function
    → fetch() to backend
      ← JSON response
    ← Normalised TypeScript type
  ← Rendered UI
```

### Layer responsibilities

| Layer | Location | Responsibility |
|-------|----------|---------------|
| **Pages** | `app/` | Next.js App Router page components. One directory = one route. |
| **Component library** | `components/ui/` | Generic reusable components (StatCard, DataTable, Modal, etc.). Import via barrel `@/components/ui`. |
| **Domain components** | `components/` | App-specific badges and wrappers. |
| **API client** | `lib/api.ts` | All backend API calls. No `fetch()` in pages. |
| **Utilities** | `lib/utils.ts` | Formatters, label maps, colour helpers. |
| **Category data** | `lib/category-data.ts` | Single source of truth for UK/Bulgaria categories. Never copy inline. |

### Key design rules

- No `shadcn/ui` — use `components/ui/` instead.
- No direct `fetch()` calls in pages — always go through `lib/api.ts`.
- No external state management — use `useState`, URL params, and `localStorage`.
- Category arrays live only in `lib/category-data.ts`.

---

## Database Schema

26 tables across functional domains:

| Domain | Tables |
|--------|--------|
| **Core** | `businesses`, `business_notes`, `call_logs`, `cloudtalk_calls` |
| **Campaigns** | `search_campaigns`, `sales_campaigns`, `sales_tasks` |
| **Intelligence** | `sales_insights`, `call_scripts` |
| **Outreach** | `email_templates`, `email_history`, `outreach_calls`, `follow_ups` |
| **Sales** | `deals`, `proposals` |
| **Projects** | `projects`, `project_deliverables`, `project_comments`, `client_credentials` |
| **Client Ops** | `client_follow_ups`, `client_documents` |
| **Sales Tools** | `sales_playbooks`, `meeting_notes`, `competitor_snapshots` |
| **Activity** | `activities` |

---

## Folder Structure

```
leadscrapper/
├── backend/
│   ├── alembic/
│   │   └── versions/            # Migration files (21 migrations)
│   └── app/
│       ├── api/
│       │   └── v1/              # Route handlers
│       │       ├── businesses.py
│       │       ├── campaigns.py
│       │       ├── cloudtalk.py
│       │       ├── competitor.py
│       │       ├── csv_import.py
│       │       ├── meeting_notes.py
│       │       ├── playbooks.py
│       │       ├── preview_csv.py
│       │       ├── sales_insights.py
│       │       ├── search.py
│       │       └── workspace.py
│       ├── core/
│       │   ├── config.py        # pydantic-settings env config
│       │   ├── enums.py         # WebsiteStatus, ContactStatus, CallOutcome
│       │   └── errors.py        # db_error_handler decorator
│       ├── db/
│       │   ├── base.py          # Model registry (imports all models)
│       │   └── session.py       # SQLAlchemy engine + get_db dependency
│       ├── models/              # ORM table definitions
│       ├── providers/           # Scraper integrations
│       │   ├── google_maps.py
│       │   ├── yell.py
│       │   ├── freeindex.py
│       │   ├── localization.py  # Translations, keyword expansions
│       │   └── neighbors.py     # City radius expansion
│       ├── schemas/             # Pydantic schemas
│       └── services/
│           ├── businesses.py    # Lead scoring, filtering, analytics
│           ├── campaigns.py     # Campaign lifecycle + background runner
│           ├── cloudtalk.py     # CloudTalk API client
│           ├── csv_parser.py    # Shared CSV parsing (used by 2 routes)
│           ├── email_discovery.py
│           ├── imports.py       # Classification, dedup, batch import
│           └── website_analyzer.py  # httpx + BeautifulSoup site audit
├── frontend/
│   ├── app/                     # Next.js App Router pages
│   │   ├── page.tsx             # /  — Lead Finder
│   │   ├── crm/                 # /crm — Revenue Dashboard
│   │   ├── leads/               # /leads — Lead list
│   │   ├── leads/[id]/          # /leads/[id] — Lead detail
│   │   ├── pipeline/            # /pipeline — Kanban
│   │   ├── opportunities/       # /opportunities
│   │   ├── campaigns/           # /campaigns — Campaign manager
│   │   ├── workspace/           # /workspace — Daily ops
│   │   ├── playbooks/           # /playbooks — Sales scripts
│   │   ├── call-list/           # /call-list — Call queue
│   │   └── settings/            # /settings
│   ├── components/
│   │   ├── ui/                  # Generic component library
│   │   ├── Badge.tsx
│   │   ├── ContactStatusBadge.tsx
│   │   └── WebsiteStatusBadge.tsx
│   └── lib/
│       ├── api.ts               # API client (all backend calls)
│       ├── category-data.ts     # UK/Bulgaria categories
│       └── utils.ts             # Formatters, label maps
└── docs/                        # This documentation
```

---

## External Integrations

| Integration | Purpose | Config |
|-------------|---------|--------|
| Google Maps Places API (v1) | Lead discovery search | `GOOGLE_MAPS_API_KEY` |
| CloudTalk API | VoIP calling, contact sync | `CLOUDTALK_API_KEY`, `CLOUDTALK_AGENT_ID` |
| OpenAI API | Talking points, objection handling, opportunity report | `OPENAI_API_KEY` |
| Outscraper (optional) | Alternative lead source | `OUTSCRAPER_API_KEY` |
