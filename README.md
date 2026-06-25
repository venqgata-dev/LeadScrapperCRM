<div align="center">

# 🚀 LeadScrapperCRM

### AI-Powered Lead Generation • Sales CRM • Campaign Manager • CloudTalk Integration

Generate high-quality business leads, identify companies without websites, manage your sales pipeline, and close deals — all from one platform.

---

![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-v0.15-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.12-yellow?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge)

</div>

---

# 📌 Overview

LeadScrapperCRM is an all-in-one sales platform designed to help agencies, freelancers, and sales teams discover businesses that need a website and manage the complete sales process.

Instead of using multiple applications for lead generation, CRM, telephony, and analytics, LeadScrapperCRM combines everything into a single workflow.

---

# ✨ Features

## 🔍 Lead Generation

- Google Maps Places API
- Multi-city search
- Radius search
- Keyword expansion
- Localized searches
- UK & Bulgaria support
- 190+ business categories
- Opportunity detection
- Website detection
- Facebook-only detection
- Lead scoring
- Duplicate removal

---

## 📊 Search Campaign Manager

- Campaign Dashboard
- Progress tracking
- Pause / Resume campaigns
- Campaign history
- API usage estimation
- Duplicate campaign detection
- Estimated Google API cost
- Multi-city campaigns

---

## 👥 CRM

- Lead Management
- Pipeline
- Call Queue
- Notes
- Follow-ups
- Deal values
- Opportunity Dashboard
- Revenue Dashboard
- Call History

---

## ☎ CloudTalk Integration

- One-click calling
- Contact synchronization
- Call history
- Webhook support
- Recording support
- Agent tracking
- Automatic call logging

---

## 📈 Analytics

- Revenue tracking
- Opportunity rates
- Conversion statistics
- Category analytics
- Market analytics
- Monthly reports

---

## 🌍 Supported Markets

### 🇬🇧 United Kingdom

- 150+ localized categories

Examples

- Plumbers
- Roofers
- Electricians
- Builders
- Window Cleaners
- Hair Salons
- Dentists
- Car Washes
- Restaurants
- Landscapers
- Locksmiths
- Pest Control
- Heating Engineers

---

### 🇧🇬 Bulgaria

Localized Bulgarian search including keyword expansion

Examples

- ВиК
- Автосервиз
- Фризьор
- Ресторант
- Строителни услуги
- Ел услуги
- Салон за красота

---

# 🏗 Architecture

```text
Google Maps API
        │
        ▼
Lead Discovery Engine
        │
        ▼
Deduplication
        │
        ▼
Lead Scoring
        │
        ▼
CRM
        │
        ▼
CloudTalk
        │
        ▼
Sales Pipeline
        │
        ▼
Analytics
```

---

# 🛠 Tech Stack

## Backend

- Python
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL

## Frontend

- Next.js
- React
- TypeScript

## Infrastructure

- Docker
- Docker Compose

## Integrations

- Google Maps Places API
- CloudTalk API

---

# 🚀 Quick Start

Clone the repository

```bash
git clone https://github.com/venqgata-dev/LeadScrapperCRM.git
```

```bash
cd LeadScrapperCRM
```

Create `.env`

```env
GOOGLE_MAPS_API_KEY=YOUR_KEY

CLOUDTALK_API_KEY=YOUR_ID:YOUR_SECRET

CLOUDTALK_AGENT_ID=YOUR_AGENT_ID
```

Start the application

```bash
docker compose up -d --build
```

Open

Frontend

```
http://localhost:3000
```

Backend

```
http://localhost:8000/docs
```

---

# 📂 Project Structure

```
backend/
frontend/
docker-compose.yml
README.md
```

---

# 📈 Roadmap

## ✅ Completed

- Google Maps Search
- Lead Scoring
- Opportunity Detection
- CRM
- Pipeline
- Dashboard
- Campaign Manager
- Analytics
- CloudTalk Integration
- Search Campaigns

---

## 🚧 In Progress

- Power Dialer
- AI Sales Assistant
- Automatic Follow-ups

---

## 🔮 Planned

- AI Proposal Generator
- Email Automation
- LinkedIn Enrichment
- Website Audit AI
- PDF Proposal Generator
- Background Campaign Workers
- Scheduled Campaigns
- Multi-provider Search Engine

---

# 🤝 Contributing

Contributions, ideas and feature requests are always welcome.

Feel free to open an Issue or submit a Pull Request.

---

# ⭐ If you like this project

Give it a ⭐ on GitHub.

It helps others discover the project and motivates future development.

---

<div align="center">

## Built with ❤️ by Venqgata

**LeadScrapperCRM**

The next generation AI-powered Lead Generation & Sales CRM Platform

</div>
