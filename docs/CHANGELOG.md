# Changelog

All notable changes are documented here by milestone. Changes within a milestone are grouped by type.

---

## [Milestone 28] — Documentation Refactor (2026-06-27)

### Added
- `docs/` folder with 12 documentation files
- Professional README with feature table, architecture diagram, module collapsibles, roadmap
- `ARCHITECTURE.md` — system design, data flow, folder structure
- `FEATURES.md` — complete feature reference
- `API.md` — all endpoints with request/response shapes
- `SCRAPING.md` — providers, scrapers, category system
- `AI.md` — scoring algorithms, website analyzer, LLM integration
- `CRM.md` — pipeline, lead lifecycle, deals, projects
- `SALES.md` — workspace, playbooks, outreach, CloudTalk guide
- `DEPLOYMENT.md` — production deployment with nginx example
- `ROADMAP.md` — 28 completed + 13 planned milestones
- `CONTRIBUTING.md` — development setup and contribution guide

---

## [Milestone 27] — Enterprise Architecture Refactor (2026-06-27)

### Added
- `frontend/components/ui/` — 13-component library: StatCard, KpiTile, EmptyState, LoadingSkeleton, Spinner, PageLoader, ErrorCard, Modal, ConfirmDialog, SectionHeader, CardHeader, SearchBar, DataTable, Pagination, TextInput, Textarea, Select, Checkbox, MoneyInput, Badge, StatusDot
- `frontend/lib/category-data.ts` — single source of truth for UK/Bulgaria categories; eliminated 270+ lines of duplication
- `backend/app/services/csv_parser.py` — shared CSV parsing (read, validate, classify, deduplicate) used by both CSV endpoints
- `backend/app/core/errors.py` — `db_error_handler` decorator, `AppError` base class
- `ARCHITECTURE.md` (root) — high-level system documentation
- `frontend/COMPONENTS.md` — component library reference

### Changed
- `frontend/app/page.tsx` — removed 220+ lines of inline category constants; imports from `category-data.ts`
- `frontend/app/campaigns/page.tsx` — same refactor
- `backend/app/api/v1/csv_import.py` — reduced from 134 to 50 lines using csv_parser service
- `backend/app/api/v1/preview_csv.py` — reduced from 143 to 43 lines using csv_parser service

---

## [Milestone 26] — Sales Assistant & AI Call Center (2026-06-27)

### Added
- `backend/app/models/playbook.py` — SalesPlaybook ORM model
- `backend/app/models/meeting_note.py` — MeetingNote ORM model (one per business, upsert)
- `backend/app/models/competitor.py` — CompetitorSnapshot ORM model (SWOT per business)
- `backend/app/api/v1/playbooks.py` — full CRUD for sales playbooks
- `backend/app/api/v1/meeting_notes.py` — GET/PUT meeting notes per business
- `backend/app/api/v1/competitor.py` — GET/PUT competitor snapshot per business
- `backend/app/api/v1/workspace.py` — daily KPI stats + HOT leads endpoint
- `frontend/app/workspace/page.tsx` — daily workspace with KPI strip + manager dashboard
- `frontend/app/playbooks/page.tsx` — playbook library with create/edit/delete
- Migration `202607070001` — creates 3 new tables, seeds 12 default playbooks

### Changed
- `frontend/lib/api.ts` — added SalesPlaybook, MeetingNote, CompetitorSnapshot, WorkspaceStats types and functions

---

## [Milestone 25] — Advanced Website Audit & AI Sales Engine (2026-06-27)

### Added
- 11 new columns on `businesses`: live chat, cookie banner, booking system, WhatsApp button, Google Maps embed, broken images, missing alt, H1 count, CMS version, outdated libs JSON, analytics tools JSON
- 3 new columns on `sales_insights`: talking_points JSON, objection_responses JSON, opportunity_report JSON
- Extended `website_analyzer.py` to detect 30+ signals total
- `sales_ai.py` functions: `generate_talking_points()`, `generate_objection_responses()`, `generate_opportunity_report()`

---

## [Milestone 24] — Deals & Projects (2026-07-04)

### Added
- `deals` table — deal lifecycle with status, value, probability, close dates
- `projects` table — delivery tracking with team assignment, completion %, financials
- `project_deliverables` / `client_credentials` tables — secure credentials per project
- `project_comments` table — team notes per project

---

## [Milestone 23] — Client Follow-ups & Documents (2026-07-05)

### Added
- `client_follow_ups` table — scheduled follow-up tasks with priority and assignment
- `client_documents` table — file metadata tracking with versioning

---

## [Milestone 22] — Outreach Campaigns (2026-06-30)

### Added
- `sales_campaigns` table — targeted bulk outreach campaigns
- `sales_tasks` table — per-lead tasks within campaigns
- `email_templates` table — reusable email templates
- `email_history` table — per-business email send log
- `outreach_calls` table — call records linked to outreach tasks
- `follow_ups` table — short-term follow-up queue

---

## [Milestone 21] — AI Talking Points & Objection Handling (2026-06-29)

### Added
- `sales_insights` table — composite AI score, sub-scores, recommendations, pitch
- `call_scripts` table — AI-generated call scripts per business
- AI scoring pipeline in `services/sales_ai.py`
- `activities` table — event log for business activity stream

---

## [Milestone 20] — AI Opportunity Score & Contact Intelligence (2026-07-02)

### Added
- AI score (0–100), AI priority (HOT/WARM/COLD), estimated project value, close probability on `businesses`
- Extra social links: YouTube, TikTok, WhatsApp, contact form URL
- Social check timestamps (facebook/instagram/linkedin last checked)

---

## [Milestone 19] — Lead Explorer & Advanced Filters (2026-07-01)

### Added
- Extended business model with enrichment status fields (website_checked, social_checked, email_checked)
- Campaign linkage (`search_campaign_id`) on businesses

---

## [Milestone 18] — Website Intelligence v2 (2026-06-28)

### Added
- Extended website analysis: CMS detection (Elementor, Shopify, Squarespace, Webflow), SSL, contact form, meta description
- New columns: website_cms, website_builder, website_ssl, website_has_contact_form, website_has_meta_description, website_generator, website_language, website_wordpress, website_elementor, website_shopify, website_wix, website_squarespace, website_webflow, website_has_gtm, website_has_fb_pixel, website_has_hotjar, website_has_clarity, website_has_cloudflare
- Redesign reasons text field

---

## [Milestone 17] — Contact Enrichment (2026-06-28)

### Added
- Social channel presence detection: facebook_found, instagram_found, linkedin_found
- Follower counts: fb_followers, ig_followers
- LinkedIn data: li_company_size, li_industry
- Enrichment tracking: last_enriched_at, enrichment_status

---

## [Milestone 16] — Website Analyzer (2026-06-27)

### Added
- `website_analyzer.py` — httpx + BeautifulSoup website audit
- 15 website columns on `businesses`: platform, health score, mobile, HTTPS, title, description, H1, favicon, analytics, page size, load time, SEO score, redesign score, notes
- `GET /businesses/analytics/website` endpoint

---

## [Milestone 15] — Search Campaign Manager (2026-06-26)

### Added
- `search_campaigns` table
- Campaign lifecycle: create, start, pause, resume, cancel
- Background thread execution per campaign
- Cross-city deduplication at campaign level
- Progress tracking per city stored in `progress_data` JSON
- Duplicate campaign detection
- API cost estimation

---

## [Milestone 14] — CloudTalk Integration (2026-06-25)

### Added
- `cloudtalk_calls` table
- `cloudtalk_contact_id`, `last_call_id` on businesses
- 6 CloudTalk API endpoints: status, test, sync-contact, call, calls history
- HTTP Basic auth via `ACCESS_KEY_ID:ACCESS_KEY_SECRET`
- E.164 phone normalisation for contact sync

---

## [Milestone 13] — UK & Bulgaria Localization (2026-06-25)

### Added
- 150+ UK categories across 13 groups with keyword expansions
- 43 Bulgarian categories with Cyrillic names
- Language-aware Google Maps results (`languageCode` param)
- `localization.py` with 156 English expansion entries and Cyrillic translations

---

## [Milestone 9–12] — Scrapers & Providers (2026-06-24)

### Added
- `providers/` system with base class and registry
- `yell.py` — Yell.com BeautifulSoup scraper
- `freeindex.py` — FreeIndex UK scraper
- `thomson_local.py` — ThomsonLocal scraper
- `cylex.py` — Cylex provider (Cloudflare-protected)
- `GET /providers` — provider availability endpoint
- `POST /import-csv` + `POST /preview-csv` — CSV import pipeline
- `POST /import-batch` — batch import from search results

---

## [Milestone 5–8] — Google Maps Search (2026-06-24)

### Added
- `providers/google_maps.py` — Places API (New) text search
- Multi-city search with keyword expansion
- Neighbor city expansion
- `POST /search` endpoint returning leads + analytics

---

## [Milestone 3–4] — Sales CRM (2026-06-24)

### Added
- 8 contact statuses: NEW, CALLED, NO_ANSWER, INTERESTED, FOLLOW_UP, PROPOSAL_SENT, WON, LOST
- `call_logs` table
- `business_notes` table
- Deal value, follow-up date, proposal sent date, called at, won at on businesses
- Revenue dashboard stats
- Pipeline Kanban page
- Revenue by month, category analytics, market analytics endpoints

---

## [Milestone 1–2] — Foundation (2026-06-18)

### Added
- PostgreSQL schema with `businesses` table
- FastAPI application with SQLAlchemy 2.0 and Alembic
- Docker Compose with postgres + backend + frontend
- Lead scoring algorithm
- Website status classification (NO_WEBSITE, FACEBOOK_ONLY, FREE_BUILDER, BROKEN_WEBSITE, HAS_WEBSITE)
- Next.js 16 frontend with Tailwind CSS
- Lead Finder page, Lead list, Lead detail, CRM Dashboard
