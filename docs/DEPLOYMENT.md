# Deployment Guide

## Docker (Recommended)

The standard deployment is Docker Compose on a single server. All three services (PostgreSQL, backend, frontend) run in the same Compose stack.

### Production `.env`

```env
# Database
POSTGRES_USER=leadscrapper
POSTGRES_PASSWORD=change_me_strong_password
POSTGRES_DB=leadcrm
DATABASE_URL=postgresql://leadscrapper:change_me_strong_password@postgres:5432/leadcrm

# Backend
ENVIRONMENT=production
LOG_LEVEL=INFO
CORS_ORIGINS=["https://your-domain.com"]

# Frontend
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# Integrations
GOOGLE_MAPS_API_KEY=your_production_key
CLOUDTALK_API_KEY=key_id:key_secret
CLOUDTALK_AGENT_ID=123456
OPENAI_API_KEY=sk-...
```

### Start

```bash
docker compose up -d --build
```

### Update

```bash
git pull
docker compose build
docker compose up -d
docker compose exec backend alembic upgrade head
```

---

## Reverse Proxy (nginx)

Example nginx configuration to serve the frontend and proxy the API:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    # Backend API
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Database Backups

Backup the PostgreSQL volume:

```bash
# Dump
docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB < backup_20260627.sql
```

For automated backups, use a cron job or a managed PostgreSQL service.

---

## Monitoring

The backend exposes a health endpoint:

```
GET /health → {"status": "ok"}
```

Use this with any uptime monitor (UptimeRobot, Betterstack, etc.).

Application logs are written to stdout and captured by Docker:

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Scaling Considerations

The current architecture is a monolith on a single Docker host. For higher traffic:

- **Database**: Move PostgreSQL to a managed service (RDS, Supabase, Neon)
- **Background tasks**: Campaign runners use Python threads. For production, consider moving to Celery + Redis for better concurrency and crash recovery
- **Frontend**: Next.js can be deployed to Vercel for edge caching; set `NEXT_PUBLIC_API_URL` to your backend URL
- **Backend**: The FastAPI app can be horizontally scaled behind a load balancer; sessions are stateless

---

## Security Notes

- Change all default passwords before deploying
- Set `CORS_ORIGINS` to your exact frontend domain (not `*`)
- The API has no authentication layer — it is designed for single-team / internal use
- Do not expose `localhost:8000` directly to the internet; always use a reverse proxy with TLS
- Store `.env` outside the repository and never commit it
