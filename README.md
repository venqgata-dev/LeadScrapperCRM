<div align="center">

<h1>LeadScrapper CRM</h1>

**Enterprise AI Lead Generation & Sales Platform**

Find local businesses that need a website · Qualify them with AI · Close deals faster

<br/>

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## What is LeadScrapper?

LeadScrapper CRM is a full-stack B2B lead engine built for web development agencies. It discovers local businesses without websites, scores them with AI, and manages the complete sales workflow — from cold call to signed contract — in a single platform.

---

## Features

| CRM | AI & Intelligence | Sales Ops | Scraping |
|-----|-------------------|-----------|---------|
| ✅ Lead Explorer | ✅ AI Opportunity Score | ✅ Daily Workspace | ✅ Google Maps API |
| ✅ Pipeline (Kanban) | ✅ Website Audit Engine | ✅ Call Queue | ✅ Campaign Manager |
| ✅ Deals | ✅ Talking Points Generator | ✅ Sales Playbooks | ✅ Contact Enrichment |
| ✅ Projects | ✅ Objection Handling AI | ✅ Follow-up Manager | ✅ CSV Import |
| ✅ Client Follow-ups | ✅ Recommended Services | ✅ Outreach Campaigns | ✅ Yell / FreeIndex |
| ✅ Meeting Notes | ✅ Competitor Snapshots | ✅ CloudTalk Calling | ✅ Multi-city Search |

---

## Architecture

```
  ┌─────────────────────────────────────────┐
  │              Data Sources               │
  │  Google Maps · Yell · CSV · FreeIndex  │
  └──────────────────┬──────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   Campaign Manager  │  ← schedule, pause, resume
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │   Lead Import &     │
          │   Deduplication     │
          └──────────┬──────────┘
                     │
     ┌───────────────▼────────────────┐
     │         CRM Database           │
     │  businesses · deals · projects │
     └──┬─────────────┬───────────────┘
        │             │
  ┌─────▼──────┐  ┌───▼────────────┐
  │  Website   │  │   Sales AI     │
  │  Analyzer  │  │  Scoring &     │
  │ (httpx +   │  │  Playbooks     │
  │  BeautSoup)│  └───┬────────────┘
  └────────────┘      │
                  ┌───▼────────────┐
                  │ Outreach &     │
                  │ CloudTalk VoIP │
                  └───┬────────────┘
                      │
                  ┌───▼────────────┐
                  │  Deals →       │
                  │  Projects →    │
                  │  Client Delivery│
                  └────────────────┘
```

---

## Quick Start

```bash
git clone https://github.com/your-org/leadscrapper.git
cd leadscrapper

# Copy and fill in your API keys
cp .env.example .env

# Start everything
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| 🖥 Frontend | http://localhost:3000 |
| 🔌 API | http://localhost:8000 |
| 📖 API Docs | http://localhost:8000/docs |

> See [docs/INSTALL.md](docs/INSTALL.md) for full setup including environment variables and local dev mode.

---

## Repository Structure

```
leadscrapper/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # FastAPI route handlers
│   │   ├── core/            # Config, enums, error handling
│   │   ├── db/              # SQLAlchemy session & model registry
│   │   ├── models/          # ORM models (SQLAlchemy 2.0)
│   │   ├── providers/       # Google Maps, Yell, FreeIndex scrapers
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   └── services/        # Business logic & DB operations
│   └── alembic/             # Database migrations
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/ui/       # Reusable component library
│   └── lib/                 # API client, utils, category data
├── docs/                    # Full documentation
└── docker-compose.yml
```

---

## Modules

<details>
<summary><b>🔍 Lead Generation & Campaigns</b></summary>

- **Google Maps Places API** — text search across any UK or Bulgarian city
- **Yell.com scraper** — BeautifulSoup-based scraper with multi-page support
- **FreeIndex scraper** — UK business directory
- **Campaign Manager** — named campaigns with pause/resume, progress tracking, API cost estimation
- **Keyword expansion** — auto-generates related search terms per category
- **Neighbor cities** — radius-based surrounding city expansion
- **Deduplication** — cross-city deduplication by name + phone + address
- **Lead scoring** — scored 0–100 based on website quality, social presence, review count

</details>

<details>
<summary><b>🧠 AI Sales Intelligence</b></summary>

- **AI Opportunity Score** (0–100) — aggregates website, SEO, social, trust, contact signals
- **Priority tier** — HOT / WARM / COLD based on score thresholds
- **Estimated project value** — AI-estimated deal size in £/€
- **Close probability** — percentage estimate
- **Talking points** — 6 personalized sales talking points per lead
- **Objection handling** — pre-generated responses to common objections
- **Recommended services** — tailored upsell recommendations per business
- **Opportunity report** — structured sales brief (issues, effort, value range)
- **Next best action** — single recommended action to move the deal forward

</details>

<details>
<summary><b>🌐 Website Intelligence</b></summary>

- **Platform detection** — WordPress, Wix, Shopify, Squarespace, Webflow, Joomla, Magento, 10+ more
- **Health score** (0–100) — overall website quality
- **SEO score** — title, meta description, H1, sitemap, robots.txt
- **Redesign score** — how urgently the site needs a rebuild
- **Mobile friendliness** — viewport meta check
- **HTTPS / SSL** — certificate detection
- **Analytics tools** — GTM, GA4, Facebook Pixel, Hotjar, Clarity, Segment
- **Technical signals** — cookie banner, live chat, booking system, WhatsApp button, Google Maps embed
- **CMS version** — WordPress version, outdated library detection (jQuery 1/2, Bootstrap 2/3)
- **Broken images & missing alt text** — accessibility audit signals

</details>

<details>
<summary><b>📋 CRM & Pipeline</b></summary>

- **Lead list** — filterable, searchable table with 20+ filter dimensions
- **Pipeline view** — Kanban board across 8 contact statuses
- **Lead detail** — full profile with all signals, notes, call history, AI insights
- **Call logging** — per-call outcome tracking (Answered, No Answer, Voicemail, Busy)
- **Notes history** — timestamped notes per business
- **Deal values** — track estimated and actual deal value
- **Follow-up dates** — schedule next contact
- **Proposal tracking** — proposal sent date, viewed date, response date

</details>

<details>
<summary><b>📞 Contact Intelligence</b></summary>

- **Email discovery** — scrapes business website for contact emails
- **Social profile detection** — Facebook, Instagram, LinkedIn, YouTube, TikTok, WhatsApp
- **Follower counts** — Facebook, Instagram follower enrichment
- **LinkedIn company data** — company size, industry
- **Contact form detection** — finds web contact forms
- **Competitor snapshot** — SWOT analysis per business
- **Meeting notes** — structured notes: budget, deadline, requirements, decision maker

</details>

<details>
<summary><b>💼 Deals & Projects</b></summary>

- **Deals** — full deal lifecycle with status, probability, estimated/actual value
- **Projects** — linked to deals, with developer/designer/PM assignment
- **Completion tracking** — percentage complete
- **Financial tracking** — total value, deposit, paid amount
- **Project credentials** — secure storage of hosting, domain, WP, FTP, cPanel, Cloudflare credentials
- **Project documents** — file metadata tracking with versioning
- **Project comments** — team notes per project

</details>

<details>
<summary><b>📣 Outreach & Sales Ops</b></summary>

- **Sales Playbooks** — 12 built-in playbooks by business type, fully customizable
- **Daily Workspace** — KPI strip: calls today, follow-ups, HOT leads, pipeline value
- **Manager Dashboard** — win rate, funnel conversion rates, overdue follow-ups %
- **Outreach campaigns** — targeted bulk outreach with filters (AI score, project value, close prob)
- **Email templates** — reusable templates with subject + body
- **Email history** — per-business email send log
- **Follow-up queue** — scheduled follow-ups with priority and reminder system

</details>

<details>
<summary><b>☎️ CloudTalk VoIP</b></summary>

- **One-click calling** — initiates a call from the lead detail page
- **Contact sync** — creates/finds CloudTalk contacts by phone number
- **Call history** — per-business call log from CloudTalk API
- **Recording URLs** — linked in call history
- **Agent tracking** — which agent handled the call
- **Webhook-ready** — call status and recording updates via webhooks

</details>

<details>
<summary><b>📊 Analytics & Reports</b></summary>

- **CRM Dashboard** — total opportunities, call rates, deal stats
- **Revenue by month** — bar chart of closed revenue
- **Category analytics** — which categories convert best
- **Market analytics** — which cities have the most opportunity
- **Funnel rates** — Call → Interested → Proposal → Won percentages
- **Week-over-week call volume** — trend vs previous week

</details>

---

## Screenshots

| | |
|---|---|
| ![Lead Finder](docs/screenshots/lead-finder.png) | ![CRM Dashboard](docs/screenshots/crm-dashboard.png) |
| **Lead Finder** — search businesses by city & category | **CRM Dashboard** — revenue, pipeline, conversion stats |
| ![Pipeline](docs/screenshots/pipeline.png) | ![Workspace](docs/screenshots/workspace.png) |
| **Pipeline** — Kanban view of contact statuses | **Sales Workspace** — daily ops view |
| ![Website Intel](docs/screenshots/website-intel.png) | ![Playbooks](docs/screenshots/playbooks.png) |
| **Website Intelligence** — full site audit per lead | **Sales Playbooks** — scripts by business type |

> Screenshots will be added once the UI is finalized.

---

## Roadmap

### ✅ Completed

| # | Milestone |
|---|-----------|
| 1 | Lead database & PostgreSQL schema |
| 2 | Lead scoring & opportunity detection |
| 3 | Sales CRM pipeline (8 statuses) |
| 4 | Revenue dashboard & call analytics |
| 5 | Google Maps search integration |
| 6 | Multi-city & keyword expansion |
| 7 | Yell.com & FreeIndex scrapers |
| 8 | CSV import with deduplication |
| 9 | UK & Bulgaria localization (190+ categories) |
| 10 | CloudTalk VoIP integration |
| 11 | Search Campaign Manager |
| 12 | Website Analyzer (15 signals) |
| 13 | Contact enrichment (email, social) |
| 14 | AI Sales Opportunity Engine |
| 15 | Deals & Projects with credentials vault |
| 16 | Client follow-ups & document tracking |
| 17 | Advanced website audit (30+ signals) |
| 18 | AI talking points & objection handling |
| 19 | Sales Playbooks library |
| 20 | Daily Workspace & Manager Dashboard |
| 21 | Meeting notes & competitor SWOT |
| 22 | Outreach campaigns & email templates |
| 23 | Enterprise component library (13 components) |
| 24 | Shared category data & service refactor |

### 🔮 Planned

- [ ] Multi-user authentication & roles
- [ ] LinkedIn company enrichment
- [ ] Facebook page data scraper
- [ ] AI proposal generator (PDF)
- [ ] Email automation & sequences
- [ ] Stripe payment integration
- [ ] Scheduled / recurring campaigns
- [ ] Mobile app (React Native)
- [ ] Real-time notifications (WebSockets)
- [ ] Power dialer (auto-progression)

---

## Documentation

| Doc | Description |
|-----|-------------|
| [INSTALL.md](docs/INSTALL.md) | Docker setup, local dev, env vars, migrations |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, folder structure |
| [FEATURES.md](docs/FEATURES.md) | Full feature reference |
| [API.md](docs/API.md) | All API endpoints and request/response shapes |
| [SCRAPING.md](docs/SCRAPING.md) | Providers, scrapers, category system |
| [AI.md](docs/AI.md) | AI scoring, website analysis, sales intelligence |
| [CRM.md](docs/CRM.md) | Pipeline, leads, deals, projects |
| [SALES.md](docs/SALES.md) | Playbooks, workspace, outreach, CloudTalk |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |
| [ROADMAP.md](docs/ROADMAP.md) | Full milestone history & future plans |
| [CHANGELOG.md](docs/CHANGELOG.md) | What changed in each milestone |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | How to contribute |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Python 3.12, FastAPI 0.111, SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL 16 |
| Frontend | Next.js 16, React 18, TypeScript 5, Tailwind CSS |
| Scraping | httpx, BeautifulSoup4, lxml |
| Infrastructure | Docker, Docker Compose |
| Integrations | Google Maps Places API, CloudTalk API |

---

<div align="center">

Built with ❤️ · [Report a bug](../../issues) · [Request a feature](../../issues) · [Read the docs](docs/)

</div>
