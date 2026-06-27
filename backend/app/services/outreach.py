"""AI Outreach & Sales Automation Engine.

Generates personalized call scripts, emails, tasks, and follow-ups
entirely from existing CRM + AI insights data. No HTTP requests.
"""
from __future__ import annotations

import logging
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.business import Business
from app.models.call_script import CallScript
from app.models.outreach import (
    EmailHistory,
    EmailTemplate,
    FollowUp,
    OutreachCall,
    SalesCampaign,
    SalesTask,
)
from app.models.sales_insight import SalesInsight
from app.schemas.outreach import (
    OutreachAnalytics,
    SalesCampaignCreate,
    ScriptBatchStatus,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Default email templates (seeded on first use)
# ---------------------------------------------------------------------------

DEFAULT_TEMPLATES = [
    {
        "name": "No Website",
        "template_type": "NO_WEBSITE",
        "subject_template": "Getting {business_name} found on Google",
        "body_template": (
            "Hi {contact_name},\n\n"
            "I was searching for {category} services in {city} and noticed that "
            "{business_name} doesn't currently have a website.\n\n"
            "Most people searching for a local {category} go straight to Google — "
            "without a website, you simply won't appear in those results, and those "
            "potential customers go to a competitor who does.\n\n"
            "We build professional websites for {category} businesses that are fast, "
            "mobile-friendly, and set up to rank on Google from day one.\n\n"
            "Would it be OK if I sent over a few ideas specifically for {business_name}? "
            "No commitment — just some concrete suggestions.\n\n"
            "Best regards,\n[Your Name]"
        ),
        "is_active": True,
    },
    {
        "name": "Facebook Only",
        "template_type": "FACEBOOK_ONLY",
        "subject_template": "{business_name} on Google — not just Facebook",
        "body_template": (
            "Hi {contact_name},\n\n"
            "I came across {business_name}'s Facebook page while researching {category} "
            "businesses in {city}.\n\n"
            "Facebook is great for staying in touch with existing customers — but Google is "
            "where new customers look first. If someone searches '{category} {city}' right now, "
            "{business_name} won't come up.\n\n"
            "We could change that. A professional website paired with Google Business optimisation "
            "typically starts generating new enquiries within the first 30 days.\n\n"
            "Would you be open to a quick 10-minute call this week?\n\n"
            "Best regards,\n[Your Name]"
        ),
        "is_active": True,
    },
    {
        "name": "Website Redesign",
        "template_type": "REDESIGN",
        "subject_template": "Quick thought about {business_name}'s website",
        "body_template": (
            "Hi {contact_name},\n\n"
            "I came across {business_name}'s website while researching {category} businesses in {city}.\n\n"
            "{pain_point_1}\n\n"
            "We specialise in helping {category} businesses like yours modernise their online "
            "presence — faster websites, better mobile experience, and more enquiries.\n\n"
            "I've put together a few specific ideas for {business_name}. Would it be OK if I "
            "sent them over?\n\n"
            "Best regards,\n[Your Name]"
        ),
        "is_active": True,
    },
    {
        "name": "Restaurant / Cafe",
        "template_type": "RESTAURANT",
        "subject_template": "More customers for {business_name}",
        "body_template": (
            "Hi {contact_name},\n\n"
            "I was looking at {business_name}'s online presence and I noticed a few quick "
            "wins that could bring in more covers.\n\n"
            "{pain_point_1}\n\n"
            "For restaurants and cafes, we typically focus on: an easy-to-navigate menu online, "
            "Google Maps optimisation, and a simple booking/enquiry flow.\n\n"
            "Would a quick call this week work? I'd love to show you what we've done for "
            "similar venues in {city}.\n\n"
            "Best regards,\n[Your Name]"
        ),
        "is_active": True,
    },
    {
        "name": "Dental / Medical",
        "template_type": "DENTAL",
        "subject_template": "Attracting more patients for {business_name}",
        "body_template": (
            "Hi {contact_name},\n\n"
            "I was reviewing websites for {category} practices in {city} and came across "
            "{business_name}.\n\n"
            "{pain_point_1}\n\n"
            "For medical and dental practices, trust signals and online appointment booking "
            "are essential. A well-optimised website can significantly increase new patient "
            "enquiries without any extra advertising.\n\n"
            "I'd love to share a few ideas specifically for {business_name}. "
            "Would a brief call work for you?\n\n"
            "Best regards,\n[Your Name]"
        ),
        "is_active": True,
    },
    {
        "name": "Trades (Plumber / Electrician / Builder)",
        "template_type": "TRADES",
        "subject_template": "More local jobs for {business_name}",
        "body_template": (
            "Hi {contact_name},\n\n"
            "I was searching for {category} services in {city} and came across {business_name}.\n\n"
            "{pain_point_1}\n\n"
            "For tradespeople, local Google visibility is everything. A fast, mobile-friendly "
            "website with click-to-call, reviews, and Google Business optimisation can generate "
            "a steady stream of local enquiries.\n\n"
            "I've helped several {category} businesses in {city} get more calls from Google. "
            "Would you be open to a quick 10-minute chat?\n\n"
            "Best regards,\n[Your Name]"
        ),
        "is_active": True,
    },
    {
        "name": "Law Firm / Solicitor",
        "template_type": "LAW",
        "subject_template": "Attracting more clients for {business_name}",
        "body_template": (
            "Hi {contact_name},\n\n"
            "I was reviewing the online presence of {category} firms in {city} and came across "
            "{business_name}.\n\n"
            "{pain_point_1}\n\n"
            "For legal firms, credibility, trust signals, and clear practice area pages are "
            "critical for converting website visitors into enquiries. A well-structured site "
            "can make a significant difference to client acquisition.\n\n"
            "I've put together some specific recommendations for {business_name}. "
            "Would you have 15 minutes this week to discuss?\n\n"
            "Best regards,\n[Your Name]"
        ),
        "is_active": True,
    },
    {
        "name": "General / Generic",
        "template_type": "GENERIC",
        "subject_template": "Idea for {business_name}'s online presence",
        "body_template": (
            "Hi {contact_name},\n\n"
            "I came across {business_name} while researching {category} businesses in {city}.\n\n"
            "{pain_point_1}\n\n"
            "I think there are a few things we could do to improve {business_name}'s online "
            "presence and bring in more enquiries — without any extra advertising spend.\n\n"
            "Would you be open to me sending over a brief summary of what I'd suggest?\n\n"
            "Best regards,\n[Your Name]"
        ),
        "is_active": True,
    },
]


def seed_templates(db: Session) -> None:
    count = db.scalar(select(func.count(EmailTemplate.id)))
    if count and count > 0:
        return
    for t in DEFAULT_TEMPLATES:
        db.add(EmailTemplate(**t))
    db.commit()


# ---------------------------------------------------------------------------
# Personalization helpers
# ---------------------------------------------------------------------------

def _extract_contact_name(business_name: str) -> str:
    """Return first name if pattern like "John's Plumbing" detected, else "there"."""
    m = re.match(r"^([A-Z][a-z]{1,20})'s\s+", business_name)
    return m.group(1) if m else "there"


def _get_variant(business_id: int, n: int) -> int:
    return business_id % n


# ---------------------------------------------------------------------------
# Call script generation
# ---------------------------------------------------------------------------

def _build_opener(business: Business, variant: int) -> str:
    name = business.name
    city = business.city or "your area"
    cat = (business.category or "business").lower()
    ws = business.website_status
    cms = business.website_cms or "a website builder"

    if ws == "NO_WEBSITE":
        opts = [
            f"Hi, I was searching Google for {cat} services in {city} and noticed {name} doesn't have a website listed.",
            f"Hi, I'm calling because I was looking for {cat} companies in {city} and couldn't find a website for {name}.",
            f"Hi, I help {cat} businesses in {city} get found online — I noticed {name} doesn't have a website at the moment.",
        ]
    elif ws == "FACEBOOK_ONLY":
        opts = [
            f"Hi, I came across {name}'s Facebook page while researching {cat} businesses in {city}.",
            f"Hi, I noticed {name} has a Facebook presence but no website when I searched for {cat} in {city} on Google.",
            f"Hi, I was doing some research on {cat} companies in {city} and found {name} on Facebook.",
        ]
    elif ws == "FREE_BUILDER":
        opts = [
            f"Hi, I came across {name}'s website — I can see you're currently using {cms}.",
            f"Hi, I was reviewing {cat} websites in {city} and noticed {name} is on {cms}.",
            f"Hi, I've been reaching out to {cat} businesses in {city} — I had a look at {name}'s site and spotted a few things.",
        ]
    else:
        opts = [
            f"Hi, I came across {name}'s website while researching {cat} businesses in {city}.",
            f"Hi, I was looking at websites for {cat} companies in {city} and found {name}.",
            f"Hi, I've been doing some research on {cat} businesses in {city} and {name} came up.",
        ]
    return opts[variant % len(opts)]


def _build_hook(business: Business, pain_points: list[str], variant: int) -> str:
    name = business.name
    city = business.city or "your area"
    cat = (business.category or "business").lower()
    ws = business.website_status

    if ws == "NO_WEBSITE":
        opts = [
            f"Most people in {city} searching for a {cat} go straight to Google — without a website, {name} simply won't appear. That's a significant amount of business going to competitors.",
            f"The problem with having no website is that when someone searches '{cat} {city}' on Google right now, they'll never find {name}. That's potential customers going elsewhere every day.",
            f"In today's market, 85% of customers check online before choosing a local {cat}. Without a website, {name} is invisible to all of them.",
        ]
    elif ws == "FACEBOOK_ONLY":
        opts = [
            f"Facebook is great for keeping existing customers engaged — but Google is where new customers look. If someone searches '{cat} {city}' right now, {name} won't appear.",
            f"The challenge with a Facebook-only presence is that Google search — where most new customers start — completely bypasses it. You're missing out on a huge source of free, organic leads.",
            f"I see this a lot with {cat} businesses — strong Facebook presence, but no Google visibility. That means all those people searching locally are finding your competitors instead.",
        ]
    elif pain_points and any("SSL" in p or "Secure" in p for p in pain_points):
        opts = [
            f"I noticed {name}'s website currently shows as 'Not Secure' in browsers — that warning alone is enough to make a lot of potential customers click away immediately.",
            f"The SSL issue on {name}'s website is significant — modern browsers flag non-HTTPS sites with a 'Not Secure' warning, which kills trust and conversions.",
            f"One thing I noticed straight away: {name}'s site doesn't have an SSL certificate. Google actually penalises sites without HTTPS in search rankings, on top of the trust issue.",
        ]
    elif pain_points and any("mobile" in p.lower() for p in pain_points):
        opts = [
            f"I noticed {name}'s website isn't fully optimised for mobile — and given that over 70% of local searches now happen on phones, that's costing you enquiries every day.",
            f"The mobile experience on {name}'s website needs attention — most of your potential customers will be viewing it on their phones, and a poor mobile experience sends them straight to a competitor.",
            f"Here's the thing: when most people search for a {cat} in {city}, they're on their phone. If the website doesn't work well on mobile, they'll move on instantly.",
        ]
    elif pain_points and any(("redesign" in p.lower() or "old" in p.lower() or "poor" in p.lower()) for p in pain_points):
        opts = [
            f"I noticed {name}'s website looks like it might be a few years old — modern, fast-loading sites convert significantly better and rank higher on Google.",
            f"The website has some good information, but the design and performance could do with a refresh. Outdated sites tend to rank lower and convert fewer visitors into enquiries.",
            f"From a customer's perspective, an older-looking website can undermine trust — even if the business behind it is excellent. A modern design makes a big difference.",
        ]
    elif pain_points:
        opts = [
            f"I noticed: {pain_points[0]}",
            f"Looking at {name}'s online presence, I spotted something worth mentioning: {pain_points[0].lower()}",
            f"One thing caught my attention when I looked at {name}: {pain_points[0].lower()}",
        ]
    else:
        opts = [
            f"I think there are a few specific improvements that could meaningfully increase the number of enquiries {name} gets online.",
            f"I've spotted a couple of things on {name}'s website that I think are worth a quick conversation.",
            f"Having looked at {name}'s online presence, I have some ideas I think you'd find genuinely useful.",
        ]
    return opts[variant % len(opts)]


def _build_value_prop(business: Business, insight: SalesInsight | None, variant: int) -> str:
    cat = (business.category or "business").lower()
    ws = business.website_status

    if insight and insight.recommended_services:
        svcs = insight.recommended_services[:3]
        svc_txt = ", ".join(svcs[:2])
        if len(svcs) > 2:
            svc_txt += f", and {svcs[2].lower()}"
        opts = [
            f"We specialise in helping {cat} businesses — specifically {svc_txt}. The results are typically more calls, more website enquiries, and stronger Google rankings.",
            f"We work with {cat} companies on exactly these issues: {svc_txt}. Most clients see measurable improvement within the first 60 days.",
            f"Our work for {cat} businesses usually covers {svc_txt} — all designed to generate more enquiries without paid advertising.",
        ]
    elif ws in ("NO_WEBSITE", "FACEBOOK_ONLY"):
        opts = [
            f"We build professional websites for {cat} businesses that are fast, mobile-friendly, and built to rank on Google from day one. Most clients get their first new enquiry within 30 days.",
            f"We design websites specifically for {cat} businesses — clean, fast, and set up properly for local Google search. It's the foundation for everything else.",
            f"We create websites that are built to convert — not just look good. For a {cat} business, that means click-to-call, Google Maps integration, and local SEO from the start.",
        ]
    else:
        opts = [
            f"We help {cat} businesses improve their online presence — website performance, local SEO, and lead generation. The goal is always the same: more enquiries without more ad spend.",
            f"We work with {cat} businesses on exactly these kinds of issues. Small improvements to a website can translate into a significant increase in enquiries.",
            f"Our focus is on helping local {cat} businesses get more inbound enquiries from Google. It's about making what you already have work harder.",
        ]
    return opts[variant % len(opts)]


def _build_cta(business: Business, insight: SalesInsight | None, variant: int) -> str:
    name = business.name
    close_prob = insight.estimated_close_probability if insight else 0
    proj_val = insight.estimated_project_value if insight else 0

    if close_prob >= 70:
        opts = [
            f"I'd love to jump on a quick 5-minute call this week to walk you through exactly what I have in mind for {name}. Would that work for you?",
            f"Would you have 5 minutes this week? I've actually put together a few specific ideas for {name} — I think you'd find it useful.",
            f"Could we grab 5 minutes this week? I want to show you something specific about {name}'s situation that I think is genuinely worth your time.",
        ]
    elif close_prob >= 50:
        opts = [
            f"Would you be open to me sending over a brief summary of what I'd suggest for {name}? No commitment — just some concrete ideas.",
            f"Could I send you a quick overview of what we'd recommend for {name}? It's a page or two, completely free, and you can take it or leave it.",
            f"Would it be useful if I put together a short proposal for {name} and sent it over? No strings attached — I just think there's a good opportunity here.",
        ]
    else:
        opts = [
            f"I'll be upfront — I think we could genuinely help {name} get more enquiries online. Would you be open to a quick chat?",
            f"I don't want to take up too much of your time — would it be OK if I sent you a one-page summary of what I'd suggest for {name}?",
            f"If it's not the right time, that's completely fine — but would you mind if I sent something over you could look at when it suits?",
        ]
    return opts[variant % len(opts)]


def _build_objection_handler(business: Business, variant: int) -> str:
    name = business.name
    cat = (business.category or "business").lower()
    opts = [
        f"If you have someone already handling it, that's completely fine — I just wanted to make sure you'd seen what's possible with a more modern approach.",
        f"I know you probably get calls like this — I'll be quick, I promise. I noticed some specific things about {name} that I think are genuinely worth five minutes.",
        f"No pressure at all — if it's not the right time, I understand completely. I just reached out because I think there's a real opportunity here for {name}.",
    ]
    return opts[variant % len(opts)]


def generate_call_script_text(business: Business, insight: SalesInsight | None) -> tuple[str, str, str, str, str]:
    """Return (full_script, opener, hook, value_prop, cta)."""
    v = _get_variant(business.id, 3)
    pain = insight.pain_points if insight else []

    opener = _build_opener(business, v)
    hook = _build_hook(business, pain, v)
    val = _build_value_prop(business, insight, v)
    cta = _build_cta(business, insight, v)
    obj = _build_objection_handler(business, v)

    full = f"{opener}\n\n{hook}\n\n{val}\n\n{cta}\n\n[Objection handler]: {obj}"
    return full, opener, hook, val, cta


def generate_or_update_script(business: Business, insight: SalesInsight | None, db: Session) -> CallScript:
    script_obj = db.query(CallScript).filter(CallScript.business_id == business.id).first()
    full, opener, hook, val, cta = generate_call_script_text(business, insight)
    now = datetime.now(tz=timezone.utc)

    if script_obj is None:
        script_obj = CallScript(business_id=business.id)
        db.add(script_obj)

    script_obj.script_text = full
    script_obj.opening_line = opener
    script_obj.pain_point_hook = hook
    script_obj.value_proposition = val
    script_obj.call_to_action = cta
    script_obj.generated_at = now
    script_obj.updated_at = now

    db.commit()
    db.refresh(script_obj)
    return script_obj


# ---------------------------------------------------------------------------
# Email generation
# ---------------------------------------------------------------------------

def _select_template(business: Business, db: Session) -> EmailTemplate | None:
    cat = (business.category or "").lower()
    ws = business.website_status

    type_pref: str | None = None
    if ws == "NO_WEBSITE":
        type_pref = "NO_WEBSITE"
    elif ws == "FACEBOOK_ONLY":
        type_pref = "FACEBOOK_ONLY"
    elif any(k in cat for k in ["restaurant", "cafe", "takeaway", "bistro", "deli"]):
        type_pref = "RESTAURANT"
    elif any(k in cat for k in ["dental", "dentist", "doctor", "medical", "clinic", "optician"]):
        type_pref = "DENTAL"
    elif any(k in cat for k in ["plumber", "electrician", "builder", "heating", "boiler", "roofer", "carpenter"]):
        type_pref = "TRADES"
    elif any(k in cat for k in ["law", "solicitor", "barrister", "legal"]):
        type_pref = "LAW"
    elif ws in ("FREE_BUILDER",) or (business.website_redesign_score and business.website_redesign_score >= 60):
        type_pref = "REDESIGN"

    if type_pref:
        t = db.query(EmailTemplate).filter(EmailTemplate.template_type == type_pref, EmailTemplate.is_active.is_(True)).first()
        if t:
            return t

    return db.query(EmailTemplate).filter(EmailTemplate.template_type == "GENERIC", EmailTemplate.is_active.is_(True)).first()


def generate_email_content(business: Business, insight: SalesInsight | None, template: EmailTemplate | None, db: Session) -> tuple[str, str]:
    """Return (subject, body) for the given business."""
    name = business.name
    city = business.city or "your area"
    cat = (business.category or "business").lower()
    contact = _extract_contact_name(name)
    pain_points = insight.pain_points if insight else []
    pain1 = pain_points[0] if pain_points else f"I noticed some improvements that could bring in more enquiries for {name}."

    if template is None:
        template = _select_template(business, db)

    if template:
        subject = template.subject_template.format(
            business_name=name, contact_name=contact, category=cat, city=city,
            pain_point_1=pain1,
        )
        body = template.body_template.format(
            business_name=name, contact_name=contact, category=cat, city=city,
            pain_point_1=pain1,
        )
        return subject, body

    # Fallback — generate without template
    v = _get_variant(business.id, 3)
    ws = business.website_status

    subjects = {
        "NO_WEBSITE": [f"Getting {name} found on Google", f"New {cat} customers in {city} — are they finding you?", f"A website for {name}"],
        "FACEBOOK_ONLY": [f"{name} on Google — not just Facebook", f"Question about {name}'s online presence", f"More {cat} customers from Google"],
    }
    subject_opts = subjects.get(ws, [f"Idea for {name}'s website", f"Quick thought about {name}'s online presence", f"{name} — a few improvements I had in mind"])
    subject = subject_opts[v % len(subject_opts)]

    body_parts = [
        f"Hi {contact},\n",
        _build_opener(business, v) + "\n",
        _build_hook(business, pain_points, v) + "\n",
        _build_value_prop(business, insight, v) + "\n",
        _build_cta(business, insight, v) + "\n",
        "\nBest regards,\n[Your Name]\n[Your Agency]",
    ]
    body = "\n".join(body_parts)
    return subject, body


def save_email_draft(business: Business, subject: str, body: str, template_id: int | None, db: Session) -> EmailHistory:
    entry = EmailHistory(
        business_id=business.id,
        template_id=template_id,
        subject=subject,
        body=body,
        status="DRAFT",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# ---------------------------------------------------------------------------
# Campaign creation
# ---------------------------------------------------------------------------

def _task_priority(business: Business) -> int:
    score = business.ai_score or 0
    if score >= 70: return 1
    if score >= 50: return 2
    if score >= 30: return 3
    return 5


def create_outreach_campaign(db: Session, payload: SalesCampaignCreate) -> SalesCampaign:
    """Create a sales campaign + tasks for every matching business."""
    now = datetime.now(tz=timezone.utc)
    today_end = now.replace(hour=23, minute=59, second=59)

    q = db.query(Business).filter(Business.phone.isnot(None))

    if payload.country:
        q = q.filter(Business.country.ilike(f"%{payload.country}%"))
    if payload.category:
        q = q.filter(Business.category.ilike(f"%{payload.category}%"))
    if payload.min_ai_score > 0:
        q = q.filter(Business.ai_score >= payload.min_ai_score)
    if payload.min_project_value > 0:
        q = q.filter(Business.ai_project_value >= payload.min_project_value)
    if payload.min_close_probability > 0:
        q = q.filter(Business.ai_close_prob >= payload.min_close_probability)

    q = q.order_by(Business.ai_score.desc().nullslast())
    businesses = q.limit(payload.max_businesses).all()

    campaign = SalesCampaign(
        name=payload.name,
        description=payload.description,
        campaign_type=payload.campaign_type,
        status="ACTIVE",
        country=payload.country,
        category=payload.category,
        min_ai_score=payload.min_ai_score,
        min_project_value=payload.min_project_value,
        min_close_probability=payload.min_close_probability,
        target_count=len(businesses),
    )
    db.add(campaign)
    db.flush()  # get id without full commit

    task_types = _campaign_task_types(payload.campaign_type)
    for b in businesses:
        for i, ttype in enumerate(task_types):
            due = today_end if i == 0 else now + timedelta(days=i * 2)
            db.add(SalesTask(
                campaign_id=campaign.id,
                business_id=b.id,
                task_type=ttype,
                status="PENDING",
                priority=_task_priority(b),
                due_date=due,
            ))

    db.commit()
    db.refresh(campaign)
    return campaign


def _campaign_task_types(campaign_type: str) -> list[str]:
    return {
        "COLD_CALL":  ["CALL"],
        "EMAIL":      ["EMAIL"],
        "FACEBOOK":   ["FACEBOOK"],
        "LINKEDIN":   ["LINKEDIN"],
        "MIXED":      ["CALL", "EMAIL"],
    }.get(campaign_type, ["CALL"])


# ---------------------------------------------------------------------------
# Task management
# ---------------------------------------------------------------------------

def get_todays_tasks(db: Session) -> list[dict]:
    now = datetime.now(tz=timezone.utc)
    today_end = now.replace(hour=23, minute=59, second=59)

    tasks = (
        db.query(SalesTask)
        .join(Business, SalesTask.business_id == Business.id)
        .filter(SalesTask.status == "PENDING", SalesTask.due_date <= today_end)
        .order_by(SalesTask.priority.asc(), Business.ai_score.desc().nullslast())
        .limit(200)
        .all()
    )
    return _enrich_tasks(tasks)


def get_call_queue(db: Session, campaign_id: int | None = None) -> list[dict]:
    q = (
        db.query(SalesTask)
        .join(Business, SalesTask.business_id == Business.id)
        .filter(SalesTask.status == "PENDING", SalesTask.task_type == "CALL")
    )
    if campaign_id:
        q = q.filter(SalesTask.campaign_id == campaign_id)
    tasks = q.order_by(SalesTask.priority.asc(), Business.ai_score.desc().nullslast()).limit(200).all()
    return _enrich_tasks(tasks)


def get_email_queue(db: Session, campaign_id: int | None = None) -> list[dict]:
    q = (
        db.query(SalesTask)
        .join(Business, SalesTask.business_id == Business.id)
        .filter(SalesTask.status == "PENDING", SalesTask.task_type == "EMAIL")
    )
    if campaign_id:
        q = q.filter(SalesTask.campaign_id == campaign_id)
    tasks = q.order_by(SalesTask.priority.asc(), Business.ai_score.desc().nullslast()).limit(200).all()
    return _enrich_tasks(tasks)


def _enrich_tasks(tasks: list[SalesTask]) -> list[dict]:
    result = []
    for t in tasks:
        b = t.business
        result.append({
            "id": t.id,
            "campaign_id": t.campaign_id,
            "business_id": t.business_id,
            "task_type": t.task_type,
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "notes": t.notes,
            "created_at": t.created_at.isoformat(),
            "business_name": b.name,
            "business_phone": b.phone,
            "business_city": b.city,
            "business_category": b.category,
            "business_ai_score": b.ai_score,
            "business_ai_priority": b.ai_priority,
            "business_ai_project_value": b.ai_project_value,
            "business_ai_close_prob": b.ai_close_prob,
        })
    return result


def complete_task(task_id: int, db: Session) -> SalesTask | None:
    task = db.get(SalesTask, task_id)
    if not task:
        return None
    task.status = "COMPLETED"
    task.completed_at = datetime.now(tz=timezone.utc)
    # Increment campaign counter
    if task.campaign_id:
        db.query(SalesCampaign).filter(SalesCampaign.id == task.campaign_id).update(
            {"contacted_count": SalesCampaign.contacted_count + 1}
        )
    db.commit()
    db.refresh(task)
    return task


def skip_task(task_id: int, db: Session) -> SalesTask | None:
    task = db.get(SalesTask, task_id)
    if not task:
        return None
    task.status = "SKIPPED"
    db.commit()
    db.refresh(task)
    return task


# ---------------------------------------------------------------------------
# Follow-up scheduling
# ---------------------------------------------------------------------------

def schedule_follow_ups(business_id: int, outcome: str, db: Session) -> list[FollowUp]:
    now = datetime.now(tz=timezone.utc)
    schedules: list[tuple[str, int]] = []  # (type, days_offset)

    if outcome in ("ANSWERED", "INTERESTED", "CALLED"):
        schedules = [("CALLBACK", 1)]
    elif outcome == "NO_ANSWER":
        schedules = [("SECOND_CALL", 1), ("SECOND_CALL", 7), ("FINAL_EMAIL", 14)]
    elif outcome == "VOICEMAIL":
        schedules = [("SECOND_CALL", 2), ("EMAIL", 3)]
    elif outcome == "EMAIL_SENT":
        schedules = [("FOLLOW_UP_CALL", 3), ("SECOND_EMAIL", 7)]

    created = []
    for ftype, days in schedules:
        fu = FollowUp(
            business_id=business_id,
            follow_up_type=ftype,
            scheduled_for=now + timedelta(days=days),
            status="PENDING",
        )
        db.add(fu)
        created.append(fu)

    if created:
        db.commit()
        for f in created:
            db.refresh(f)

    return created


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

def get_analytics(db: Session) -> OutreachAnalytics:
    from sqlalchemy import func as F
    now = datetime.now(tz=timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59)

    total_campaigns = db.scalar(select(F.count(SalesCampaign.id))) or 0
    active_campaigns = db.scalar(select(F.count(SalesCampaign.id)).where(SalesCampaign.status == "ACTIVE")) or 0
    total_tasks = db.scalar(select(F.count(SalesTask.id))) or 0
    tasks_today = db.scalar(select(F.count(SalesTask.id)).where(SalesTask.due_date.between(today_start, today_end))) or 0
    pending_tasks = db.scalar(select(F.count(SalesTask.id)).where(SalesTask.status == "PENDING")) or 0
    completed_tasks = db.scalar(select(F.count(SalesTask.id)).where(SalesTask.status == "COMPLETED")) or 0
    scripts = db.scalar(select(F.count(CallScript.id))) or 0
    emails_drafted = db.scalar(select(F.count(EmailHistory.id))) or 0
    emails_sent = db.scalar(select(F.count(EmailHistory.id)).where(EmailHistory.status == "SENT")) or 0
    follow_ups_pending = db.scalar(select(F.count(FollowUp.id)).where(FollowUp.status == "PENDING")) or 0
    calls_made = db.scalar(select(F.count(OutreachCall.id))) or 0
    targeted = db.scalar(select(F.count(SalesTask.business_id.distinct()))) or 0

    return OutreachAnalytics(
        total_campaigns=total_campaigns,
        active_campaigns=active_campaigns,
        total_tasks=total_tasks,
        tasks_today=tasks_today,
        pending_tasks=pending_tasks,
        completed_tasks=completed_tasks,
        scripts_generated=scripts,
        emails_drafted=emails_drafted,
        emails_sent=emails_sent,
        follow_ups_pending=follow_ups_pending,
        calls_made=calls_made,
        total_businesses_targeted=targeted,
    )


# ---------------------------------------------------------------------------
# Batch script generation (background thread)
# ---------------------------------------------------------------------------

_lock = threading.Lock()
_batch_job: dict = {
    "running": False, "paused": False, "stop_requested": False,
    "total": 0, "processed": 0, "started_at": None,
    "current_business": None, "scripts_generated": 0, "emails_generated": 0,
}


def _snap() -> dict:
    with _lock:
        return dict(_batch_job)


def _upd(**kw: Any) -> None:
    with _lock:
        _batch_job.update(kw)


def _batch_worker(business_ids: list[int], db_factory, gen_emails: bool) -> None:
    _upd(running=True, paused=False, stop_requested=False, processed=0,
         total=len(business_ids), started_at=time.time(),
         current_business=None, scripts_generated=0, emails_generated=0)

    db: Session = db_factory()
    try:
        # Ensure templates exist
        seed_templates(db)

        for bid in business_ids:
            s = _snap()
            if s["stop_requested"]:
                break
            while s["paused"] and not s["stop_requested"]:
                time.sleep(0.3)
                s = _snap()

            business = db.get(Business, bid)
            if not business:
                with _lock:
                    _batch_job["processed"] += 1
                continue

            _upd(current_business=business.name)
            insight = db.query(SalesInsight).filter(SalesInsight.business_id == bid).first()

            try:
                generate_or_update_script(business, insight, db)
                with _lock:
                    _batch_job["scripts_generated"] += 1
            except Exception as exc:
                logger.error("Script generation error for %s: %s", bid, exc)

            if gen_emails:
                try:
                    subject, body = generate_email_content(business, insight, None, db)
                    save_email_draft(business, subject, body, None, db)
                    with _lock:
                        _batch_job["emails_generated"] += 1
                except Exception as exc:
                    logger.error("Email generation error for %s: %s", bid, exc)

            with _lock:
                _batch_job["processed"] += 1
    finally:
        db.close()
        _upd(running=False, current_business=None)


def batch_generate(business_ids: list[int], db_factory, gen_emails: bool = False) -> None:
    if _snap()["running"]:
        return
    t = threading.Thread(target=_batch_worker, args=(business_ids, db_factory, gen_emails), daemon=True)
    t.start()


def pause_batch() -> None:
    _upd(paused=True)


def resume_batch() -> None:
    _upd(paused=False)


def stop_batch() -> None:
    _upd(stop_requested=True, paused=False)


def get_batch_status(db: Session) -> ScriptBatchStatus:
    s = _snap()
    elapsed = (time.time() - s["started_at"]) if s["started_at"] else 0.0
    total_scripts = db.scalar(select(func.count(CallScript.id))) or 0
    total_emails = db.scalar(select(func.count(EmailHistory.id))) or 0
    return ScriptBatchStatus(
        running=s["running"],
        paused=s["paused"],
        total=s["total"],
        processed=s["processed"],
        elapsed_seconds=round(elapsed, 1),
        current_business=s["current_business"],
        scripts_generated=total_scripts,
        emails_generated=total_emails,
    )
