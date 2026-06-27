# Installation Guide

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Docker | 24.x |
| Docker Compose | v2.x |
| Git | any |

No other dependencies are required on the host machine. All Python and Node.js dependencies are installed inside Docker containers.

---

## Docker Setup (Recommended)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/leadscrapper.git
cd leadscrapper
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database (leave as-is for local Docker setup)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=leadcrm
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/leadcrm

# Google Maps — required for lead search
GOOGLE_MAPS_API_KEY=your_key_here

# CloudTalk — optional, enables VoIP calling
CLOUDTALK_API_KEY=access_key_id:access_key_secret
CLOUDTALK_AGENT_ID=123456

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Build and start

```bash
docker compose up -d --build
```

First start takes ~2–3 minutes to build the images. Subsequent starts take seconds.

### 4. Verify

| Service | URL | Expected |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Lead Finder page |
| API | http://localhost:8000/health | `{"status":"ok"}` |
| API Docs | http://localhost:8000/docs | Swagger UI |

---

## Environment Variables Reference

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `POSTGRES_USER` | DB username (used by postgres container) |
| `POSTGRES_PASSWORD` | DB password |
| `POSTGRES_DB` | DB name |

### Optional — Integrations

| Variable | Description |
|----------|-------------|
| `GOOGLE_MAPS_API_KEY` | [Google Maps Places API](https://console.cloud.google.com/) key. Enables the lead search feature. Without it, only CSV import works. |
| `CLOUDTALK_API_KEY` | Format: `access_key_id:access_key_secret`. Enables one-click calling. |
| `CLOUDTALK_AGENT_ID` | Numeric agent ID from CloudTalk dashboard. Required for call initiation. |
| `OUTSCRAPER_API_KEY` | Outscraper.com API key (alternative lead source, optional). |
| `OPENAI_API_KEY` | OpenAI API key. Required for AI talking points, objection handling, and opportunity reports. |

### Frontend

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL as seen from the browser. Use `http://localhost:8000` for local dev. |

---

## Database Migrations

Migrations run automatically on container start. To run them manually:

```bash
docker compose exec backend alembic upgrade head
```

To check current migration status:

```bash
docker compose exec backend alembic current
```

Migration files live in `backend/alembic/versions/`. They are additive only — columns and tables are never dropped.

---

## Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Requires a running PostgreSQL instance
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leadcrm
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Set API URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

Frontend runs on http://localhost:3000.

---

## Stopping and Resetting

```bash
# Stop containers
docker compose down

# Stop and remove all data (wipes the database)
docker compose down -v
```

---

## Troubleshooting

**Backend keeps restarting**
```bash
docker compose logs backend
```
Usually a missing env var or Alembic migration error.

**Frontend shows blank page or API errors**
Check that `NEXT_PUBLIC_API_URL` points to the correct backend address. In Docker it must be `http://localhost:8000` (accessible from the browser, not from inside Docker).

**Google Maps search returns no results**
Verify `GOOGLE_MAPS_API_KEY` is set and the Places API (New) is enabled in Google Cloud Console. The key must have Places API v1 access.
