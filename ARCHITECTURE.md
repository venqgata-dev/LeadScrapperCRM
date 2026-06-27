# LeadScrapper – Architecture Overview

## Project Structure

```
leadscrapper/
├── backend/              # FastAPI Python application
│   ├── app/
│   │   ├── api/v1/       # Route handlers (thin — delegate to services)
│   │   ├── core/         # Shared infrastructure (errors, config)
│   │   ├── db/           # SQLAlchemy session + base model registry
│   │   ├── models/       # ORM models (SQLAlchemy 2.0 Mapped style)
│   │   ├── providers/    # External data provider integrations
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   └── services/     # Business logic (pure functions + DB operations)
│   └── alembic/          # Database migrations (additive only — never drop)
├── frontend/             # Next.js 16 App Router application
│   ├── app/              # Page components (one directory = one route)
│   ├── components/
│   │   ├── ui/           # Generic reusable UI components
│   │   └── *.tsx         # Domain-specific shared components
│   └── lib/              # Shared utilities and API client
└── docker-compose.yml    # postgres + backend + frontend
```

---

## Backend

### Technology Stack
- **Python 3.12** with **FastAPI**
- **SQLAlchemy 2.0** (Mapped[] style ORM)
- **Alembic** for migrations
- **PostgreSQL** as the database
- **httpx** + **BeautifulSoup** for web scraping
- **Pydantic v2** for validation

### Data Flow

```
HTTP Request
  → FastAPI Router (api/v1/)
    → Service function (services/)
      → ORM Model (models/)
        → PostgreSQL
      ← Business object
    ← Pydantic schema (schemas/)
  ← JSON Response
```

### Key Design Rules
- **Migrations are additive only.** Never drop columns or tables. Use `nullable=True` for new columns.
- **Never use `index=True` in `op.create_table()` columns** if also calling `op.create_index()` separately.
- **JSON columns** for list/dict data: `Mapped[list] = mapped_column(sa.JSON(), nullable=True)`.
- **Upsert pattern** for one-per-business records: `GET` returns `null` if missing, `PUT` creates or updates.

### Router Conventions
- Routers live in `api/v1/` and are registered in `api/routes.py`.
- Use `response_model=` on every endpoint.
- Delegate all DB logic to `services/`. Routers should not contain business logic.
- Use `@db_error_handler()` from `app.core.errors` to standardise DB error responses.

### Services
| File | Responsibility |
|------|---------------|
| `businesses.py` | CRUD, filtering, analytics, lead scoring |
| `campaigns.py` | Campaign lifecycle management |
| `cloudtalk.py` | CloudTalk API integration |
| `imports.py` | Lead classification, deduplication, batch import |
| `csv_parser.py` | Shared CSV parsing logic (used by both CSV endpoints) |
| `website_analyzer.py` | Homepage scraping and signal detection |
| `sales_ai.py` | AI-generated talking points, opportunity reports |
| `email_discovery.py` | External email discovery |

---

## Frontend

### Technology Stack
- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS** (no component library — use `components/ui/`)
- **React 18**

### Data Flow

```
Page Component
  → lib/api.ts function
    → fetch() to backend
      ← JSON response
    ← Normalised TypeScript type
  ← Rendered UI
```

### Key Design Rules
- **All API calls go through `lib/api.ts`**. No `fetch()` calls in page components.
- **Shared UI components** live in `components/ui/`. Never re-implement patterns inline.
- **Category data** is in `lib/category-data.ts`. Import from there — do not copy-paste.
- **localStorage** for ephemeral UI state (e.g. pre-call checklist). No DB migration needed.
- **No shadcn/ui** — use the `components/ui/` library instead.

### Page Routing
| Route | Purpose |
|-------|---------|
| `/` | Lead Finder — search for businesses without websites |
| `/leads` | CRM lead list with filters |
| `/leads/[id]` | Lead detail — all tabs for a single business |
| `/crm` | Dashboard with KPI summary |
| `/pipeline` | Kanban view by contact status |
| `/opportunities` | Filtered high-priority leads |
| `/campaigns` | Search campaign manager |
| `/call-list` | Call log viewer |
| `/workspace` | Daily sales workspace + manager dashboard |
| `/playbooks` | Sales playbook library |
| `/deals` | Deal pipeline |
| `/projects` | Project tracker |
| `/followups` | Follow-up manager |
| `/outreach` | Outreach campaign manager |
| `/settings` | Configuration |

### Component Library (`components/ui/`)
See [COMPONENTS.md](frontend/COMPONENTS.md) for full reference.

---

## State Management

No external state management library. State lives in:

1. **React `useState`** — local component state (form fields, loading flags, modals)
2. **URL search params** — persistent filter/sort state (Back button works)
3. **`localStorage`** — ephemeral UI preferences (checklist ticks, collapsed panels)
4. **Database** — all persistent business data

---

## Authentication

Currently no authentication layer. Add at the FastAPI middleware level when needed.

---

## Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `GOOGLE_MAPS_API_KEY` | backend | Google Maps Places API |
| `CLOUDTALK_API_KEY` | backend | CloudTalk integration |
| `CLOUDTALK_PHONE_NUMBER` | backend | Outbound caller ID |
| `OPENAI_API_KEY` | backend | AI feature generation |

---

## Running Locally

```bash
docker compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`

### Running Migrations

```bash
docker compose exec backend alembic upgrade head
```
