from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import WebsiteStatus
from app.db.session import Base


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    email_source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    google_maps_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    facebook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=WebsiteStatus.HAS_WEBSITE.value,
        server_default=WebsiteStatus.HAS_WEBSITE.value,
        index=True,
    )
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    country: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    category: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    rating: Mapped[Decimal | None] = mapped_column(Numeric(2, 1), nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lead_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        index=True,
    )
    contact_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="NEW",
        server_default="NEW",
        index=True,
    )
    last_contacted: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    website_checked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    opportunity_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # CloudTalk integration fields (added in migration 202606250001)
    cloudtalk_contact_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    last_call_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Sales pipeline fields (added in migration 202606240002)
    deal_value: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True, index=True)
    follow_up_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    proposal_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    called_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    won_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Website analysis fields
    website_platform: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website_health_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    website_last_checked: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    website_mobile_friendly: Mapped[bool | None] = mapped_column(nullable=True)
    website_https: Mapped[bool | None] = mapped_column(nullable=True)
    website_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_h1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website_has_favicon: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_analytics: Mapped[bool | None] = mapped_column(nullable=True)
    website_page_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    website_load_time: Mapped[float | None] = mapped_column(nullable=True)
    website_seo_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    website_redesign_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    website_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_cms: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website_builder: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website_ssl: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_contact_form: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_meta_description: Mapped[bool | None] = mapped_column(nullable=True)
    website_generator: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website_language: Mapped[str | None] = mapped_column(String(20), nullable=True)
    website_wordpress: Mapped[bool | None] = mapped_column(nullable=True)
    website_elementor: Mapped[bool | None] = mapped_column(nullable=True)
    website_shopify: Mapped[bool | None] = mapped_column(nullable=True)
    website_wix: Mapped[bool | None] = mapped_column(nullable=True)
    website_squarespace: Mapped[bool | None] = mapped_column(nullable=True)
    website_webflow: Mapped[bool | None] = mapped_column(nullable=True)
    website_last_analyzed: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    website_load_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    website_has_gtm: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_fb_pixel: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_hotjar: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_clarity: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_cloudflare: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_cookie_banner: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_live_chat: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_booking_system: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_google_maps_embed: Mapped[bool | None] = mapped_column(nullable=True)
    website_has_whatsapp_button: Mapped[bool | None] = mapped_column(nullable=True)
    website_broken_images_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    website_missing_alt_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    website_h1_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    website_cms_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website_outdated_libs: Mapped[list | None] = mapped_column(nullable=True, type_=JSON)
    website_analytics_tools: Mapped[list | None] = mapped_column(nullable=True, type_=JSON)
    redesign_reasons: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Social media
    facebook_found: Mapped[bool | None] = mapped_column(nullable=True)
    instagram_found: Mapped[bool | None] = mapped_column(nullable=True)
    linkedin_found: Mapped[bool | None] = mapped_column(nullable=True)
    fb_followers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ig_followers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    li_company_size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    li_industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    facebook_last_checked: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    instagram_last_checked: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    linkedin_last_checked: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Enrichment
    last_enriched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    enrichment_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website_checked: Mapped[bool | None] = mapped_column(nullable=True)
    social_checked: Mapped[bool | None] = mapped_column(nullable=True)
    email_checked: Mapped[bool | None] = mapped_column(nullable=True)
    # AI scoring
    ai_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_priority: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ai_project_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_close_prob: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Additional social / contact
    youtube_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    tiktok_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    whatsapp_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_form_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    favicon_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_contact_crawl: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Campaign linkage
    search_campaign_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    call_logs: Mapped[list["CallLog"]] = relationship(
        "CallLog", back_populates="business", cascade="all, delete-orphan", order_by="CallLog.called_at.desc()"
    )
    note_history: Mapped[list["BusinessNote"]] = relationship(
        "BusinessNote", back_populates="business", cascade="all, delete-orphan", order_by="BusinessNote.created_at.desc()"
    )
    cloudtalk_calls: Mapped[list["CloudTalkCall"]] = relationship(
        "CloudTalkCall", back_populates="business", cascade="all, delete-orphan", order_by="CloudTalkCall.created_at.desc()"
    )


class CallLog(Base):
    __tablename__ = "call_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    called_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    outcome: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    business: Mapped["Business"] = relationship("Business", back_populates="call_logs")


class BusinessNote(Base):
    __tablename__ = "business_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    business: Mapped["Business"] = relationship("Business", back_populates="note_history")


class CloudTalkCall(Base):
    __tablename__ = "cloudtalk_calls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cloudtalk_call_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    direction: Mapped[str] = mapped_column(String(16), nullable=False, default="OUTBOUND")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    recording_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    business: Mapped["Business"] = relationship("Business", back_populates="cloudtalk_calls")
