# Roadmap

## Completed Milestones

| # | Milestone | Key Deliverables |
|---|-----------|-----------------|
| 1 | **Foundation** | PostgreSQL schema, FastAPI setup, Docker Compose, business table |
| 2 | **Lead Scoring** | Lead score (0–100), opportunity detection, website status classification |
| 3 | **Sales CRM** | 8 contact statuses, deal value, follow-up date, call logs, notes history |
| 4 | **Revenue Dashboard** | CRM stats endpoint, revenue tracking, conversion rates |
| 5 | **Google Maps Search** | Places API (New) text search, multi-page results, lead import |
| 6 | **Multi-city & Expansion** | Multiple city search, keyword expansion per category |
| 7 | **Scrapers** | Yell.com, FreeIndex, ThomsonLocal providers |
| 8 | **CSV Import** | Upload CSV, classify, deduplicate, import; preview mode |
| 9 | **UK & Bulgaria Localization** | 150+ UK categories, 43 Bulgarian categories with translations |
| 10 | **Pipeline & Kanban** | Pipeline Kanban view, opportunities page, call queue |
| 11 | **Analytics** | Revenue by month, category analytics, market analytics |
| 12 | **CloudTalk Integration** | One-click calling, contact sync, call history, recording URLs |
| 13 | **Search Campaign Manager** | Named campaigns, background execution, pause/resume, progress tracking |
| 14 | **Website Analyzer** | 15 website signals, health/SEO/redesign scores, platform detection |
| 15 | **Contact Enrichment** | Email discovery, social link detection |
| 16 | **AI Scoring Engine** | Composite AI score, HOT/WARM/COLD priority, estimated project value |
| 17 | **Deals & Projects** | Deal lifecycle, project delivery tracking |
| 18 | **Project Credentials** | Secure client credential vault per project |
| 19 | **Client Follow-ups** | Scheduled follow-up tasks, priorities, assignment |
| 20 | **Advanced Website Audit** | 30+ website signals, cookie banner, live chat, booking, outdated libs |
| 21 | **AI Talking Points** | LLM-generated talking points, objection handling, opportunity report |
| 22 | **Sales Playbooks** | 12 built-in playbooks, full CRUD, category-based matching |
| 23 | **Daily Workspace** | KPI strip, HOT leads list, Manager Dashboard, funnel rates |
| 24 | **Meeting Notes & SWOT** | Structured meeting notes, competitor SWOT snapshot per business |
| 25 | **Outreach Campaigns** | Filtered bulk outreach, email templates, email history |
| 26 | **Enterprise Component Library** | 13 reusable React components (DataTable, Modal, StatCard, etc.) |
| 27 | **Code Architecture Refactor** | Shared category data, CSV parser service, error handler decorator |
| 28 | **Documentation** | ARCHITECTURE.md, COMPONENTS.md, docs/ folder |

---

## Planned Milestones

### Short-term

| # | Milestone | Description |
|---|-----------|-------------|
| 29 | **Multi-user Auth** | JWT authentication, user roles (Admin, Manager, Sales Rep), per-user data scoping |
| 30 | **Power Dialer** | Auto-advance to next lead after each call; configurable skip rules |
| 31 | **Email Automation** | Send templated emails directly from the CRM; open/reply tracking |
| 32 | **LinkedIn Enrichment** | Pull company size, industry, employees from LinkedIn company pages |

### Medium-term

| # | Milestone | Description |
|---|-----------|-------------|
| 33 | **AI Proposal Generator** | Generate Word/PDF proposals from deal + project data |
| 34 | **Facebook Page Scraper** | Extract page follower count, last post date, ad status |
| 35 | **Scheduled Campaigns** | Cron-based recurring campaigns (weekly, monthly) |
| 36 | **Stripe Integration** | Invoice creation, payment tracking, deposit receipt |
| 37 | **Real-time Notifications** | WebSocket events for new leads, call outcomes, overdue follow-ups |

### Long-term

| # | Milestone | Description |
|---|-----------|-------------|
| 38 | **Mobile App** | React Native app for call logging and lead management on the go |
| 39 | **Celery Background Workers** | Replace Python threads with Celery + Redis for reliable campaign execution |
| 40 | **Zapier / Make Integration** | Trigger workflows when deals are won, proposals sent, etc. |
| 41 | **White-label** | Multi-tenant support with custom branding per agency |

---

## Feature Requests

Open an [issue](../../issues) with the label `feature-request` to suggest a new feature.

Priority is given to requests that:
- Fit the existing architecture without major restructuring
- Are useful to agencies running high-volume lead generation
- Can be implemented without breaking existing workflows
