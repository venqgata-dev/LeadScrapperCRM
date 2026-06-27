# Contributing

## Development Setup

### 1. Fork & clone

```bash
git clone https://github.com/your-org/leadscrapper.git
cd leadscrapper
cp .env.example .env
```

### 2. Start with Docker

```bash
docker compose up -d --build
```

The backend reloads on code changes (uvicorn `--reload`). The frontend uses Next.js hot reload.

### 3. Backend-only (faster iteration)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend-only

```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

Read [docs/ARCHITECTURE.md](ARCHITECTURE.md) before making changes. Key conventions:

- **Routers are thin.** No SQL queries in `api/v1/` files. Delegate to `services/`.
- **One API function per file in `lib/api.ts`.** Never call `fetch()` in page components.
- **Migrations are additive.** Never drop a column or table. Use `nullable=True` for new columns.
- **Category data lives only in `lib/category-data.ts`.** Do not copy arrays into page components.
- **Use `components/ui/`.** Do not re-implement patterns that already exist there.

---

## Adding a New Feature

### Backend

1. **Model** — add a new file in `backend/app/models/` (SQLAlchemy 2.0 `Mapped[]` style)
2. **Migration** — `docker compose exec backend alembic revision --autogenerate -m "description"`, then review and edit the generated file
3. **Schema** — add Pydantic schemas in `backend/app/schemas/`
4. **Service** — implement business logic in `backend/app/services/`
5. **Router** — add a thin router in `backend/app/api/v1/`
6. **Register** — import the model in `backend/app/db/base.py` and the router in `backend/app/api/routes.py`

### Frontend

1. **API types** — add TypeScript interfaces and `apiFetch` wrappers to `frontend/lib/api.ts`
2. **Page** — create `frontend/app/<route>/page.tsx`
3. **Nav** — add a link to `frontend/app/layout.tsx`
4. **Components** — use `@/components/ui` imports; add to `components/ui/` only if genuinely reusable

---

## Coding Standards

### Python

- Python 3.12+
- Type hints on all function signatures
- SQLAlchemy 2.0 `Mapped[T]` style for all models
- Pydantic v2 with `model_config = ConfigDict(from_attributes=True)` for ORM schemas
- Use `@db_error_handler("label")` from `core/errors.py` on all DB operations
- No print statements — use `logging.getLogger(__name__)`

### TypeScript

- Strict TypeScript — no `any` without a comment
- All API responses normalised through typed functions in `lib/api.ts`
- No inline styles — use Tailwind utility classes

### General

- No comments that describe *what* the code does — only *why* when non-obvious
- No backwards-compatibility shims for removed code
- No error handling for impossible cases

---

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<description>` | `feat/linkedin-enrichment` |
| Bug fix | `fix/<description>` | `fix/campaign-pause-race` |
| Refactor | `refactor/<description>` | `refactor/csv-parser` |
| Docs | `docs/<description>` | `docs/api-reference` |
| Milestone | `milestone/<n>-<name>` | `milestone/32-auth` |

---

## Commit Messages

Use the imperative mood and be specific:

```
Add LinkedIn enrichment endpoint
Fix campaign pause race condition
Refactor CSV parsing into shared service
Update Business model with AI score fields
```

Not:
```
Fix bug
Update stuff
WIP
```

---

## Pull Requests

1. Keep PRs focused on a single concern
2. Describe *why* the change was made, not what it does (the diff shows that)
3. Include any relevant migration files
4. Ensure the Docker build passes before opening a PR:
   ```bash
   docker compose build
   ```

---

## Reporting Issues

Use [GitHub Issues](../../issues). Include:
- What you expected to happen
- What actually happened
- Relevant logs (`docker compose logs backend`)
- Your `.env` (without secrets)
