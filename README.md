# Lead CRM Backend

FastAPI backend for a lead generation CRM using PostgreSQL, SQLAlchemy, Alembic, and Docker Compose.

## Requirements

- Docker and Docker Compose
- Python 3.12 for local development

## Quick Start

1. Create an environment file:

   ```bash
   cp .env.example .env
   ```

2. Start the database and API:

   ```bash
   docker compose up --build
   ```

3. Open the API:

   - Health check: http://localhost:8000/health
   - Businesses: http://localhost:8000/businesses
   - API docs: http://localhost:8000/docs

The backend container runs `alembic upgrade head` before starting the API.

## Local Development

From the `backend` directory:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Set `DATABASE_URL` in your environment or create a `.env` file in the repository root.

Run migrations:

```bash
alembic upgrade head
```

Start the API:

```bash
uvicorn app.main:app --reload
```

## Project Structure

```text
backend/
├── app/
│   ├── api/
│   ├── core/
│   ├── db/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   └── main.py
├── requirements.txt
├── Dockerfile
└── alembic/
```

## Environment Variables

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=leadcrm
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/leadcrm
OUTSCRAPER_API_KEY=
OUTSCRAPER_BASE_URL=https://api.app.outscraper.com
OUTSCRAPER_IMPORT_LIMIT=50
```

## API Endpoints

- `GET /health` returns `{"status": "ok"}`
- `GET /businesses` returns businesses ordered by calculated lead score, then reviews and rating
- `POST /import-leads` imports leads through the configured provider architecture
- `POST /import-outscraper` remains available as a compatibility route and uses the same provider architecture

### Business Filters

`GET /businesses` supports these query parameters:

- `has_phone=true|false`
- `has_email=true|false`
- `website_status=NO_WEBSITE|FACEBOOK_ONLY|FREE_BUILDER|BROKEN_WEBSITE|HAS_WEBSITE`
- `minimum_reviews=25`
- `minimum_rating=4.0`
- `city=Sofia`

Example:

```bash
curl "http://localhost:8000/businesses?has_phone=true&website_status=NO_WEBSITE&minimum_reviews=10"
```

### Lead Scoring

Website need:

- `NO_WEBSITE`: `+100`
- `FACEBOOK_ONLY`: `+80`
- `FREE_BUILDER`: `+50`

Review count:

- More than `10`: `+10`
- More than `25`: `+20`
- More than `50`: `+30`

Rating:

- More than `4.0`: `+10`
- More than `4.5`: `+20`

The API calculates lead score at read time so filtering and ordering stay useful for website-sales outreach, even before a future import pipeline persists scores.

### Lead Provider Import

Supported providers:

- `outscraper`: implemented
- `yell`: placeholder
- `google_maps`: placeholder

Set `OUTSCRAPER_API_KEY` in `.env` when using the Outscraper provider, then call:

```bash
curl -X POST "http://localhost:8000/import-leads" \
  -H "Content-Type: application/json" \
  -d "{\"source\":\"outscraper\",\"keyword\":\"roofers\",\"location\":\"London\"}"
```

Response:

```json
{
  "imported": 0,
  "updated": 0,
  "skipped": 0
}
```

Imported UK businesses are deduplicated by phone when available, otherwise by name. The importer stores name, phone, website, address, city, category, rating, review count, and Google Maps URL.

Website status rules:

- Empty website: `NO_WEBSITE`
- Website contains `facebook.com`: `FACEBOOK_ONLY`
- Website contains `wix`, `weebly`, `site123`, or `yola`: `FREE_BUILDER`
- Any other website: `HAS_WEBSITE`

Each imported business gets a calculated lead score and an opportunity reason such as `No website found`, `Facebook page only`, or `Free Wix website`.
