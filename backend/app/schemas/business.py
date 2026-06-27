from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import CallOutcome, ContactStatus, WebsiteStatus


class BusinessRead(BaseModel):
    id: int
    name: str
    phone: str | None = None
    email: str | None = None
    email_source: str | None = None
    website: str | None = None
    google_maps_url: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    linkedin_url: str | None = None
    website_status: WebsiteStatus
    address: str | None = None
    city: str | None = None
    country: str | None = None
    category: str | None = None
    rating: Decimal | None = Field(default=None, ge=0, le=5)
    review_count: int = Field(ge=0)
    lead_score: int = Field(ge=0)
    contact_status: str
    last_contacted: datetime | None = None
    website_checked_at: datetime | None = None
    opportunity_reason: str | None = None
    notes: str | None = None
    # CloudTalk fields
    cloudtalk_contact_id: str | None = None
    last_call_id: str | None = None
    # Sales pipeline fields
    deal_value: Decimal | None = None
    follow_up_date: datetime | None = None
    proposal_sent_at: datetime | None = None
    called_at: datetime | None = None
    won_at: datetime | None = None
    # Website analysis
    website_platform: str | None = None
    website_health_score: int | None = None
    website_last_analyzed: datetime | None = None
    website_mobile_friendly: bool | None = None
    website_https: bool | None = None
    website_seo_score: int | None = None
    website_redesign_score: int | None = None
    website_load_time_ms: int | None = None
    website_cms: str | None = None
    website_has_analytics: bool | None = None
    website_has_contact_form: bool | None = None
    website_has_meta_description: bool | None = None
    website_wordpress: bool | None = None
    website_shopify: bool | None = None
    website_wix: bool | None = None
    website_has_gtm: bool | None = None
    website_has_fb_pixel: bool | None = None
    redesign_reasons: str | None = None
    # AI scoring
    ai_score: int | None = None
    ai_priority: str | None = None
    ai_project_value: int | None = None
    ai_close_prob: int | None = None
    # Enrichment
    enrichment_status: str | None = None
    last_enriched_at: datetime | None = None
    # Social
    fb_followers: int | None = None
    ig_followers: int | None = None
    facebook_found: bool | None = None
    instagram_found: bool | None = None
    # Extra links
    youtube_url: str | None = None
    tiktok_url: str | None = None
    whatsapp_url: str | None = None
    contact_form_url: str | None = None
    search_campaign_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BusinessUpdate(BaseModel):
    notes: str | None = None
    email: str | None = None
    email_source: str | None = None
    contact_status: ContactStatus | None = None
    deal_value: Decimal | None = None
    follow_up_date: datetime | None = None
    proposal_sent_at: datetime | None = None
    called_at: datetime | None = None
    won_at: datetime | None = None


class CallLogCreate(BaseModel):
    outcome: CallOutcome | None = None
    notes: str | None = None
    called_at: datetime | None = None


class CallLogRead(BaseModel):
    id: int
    business_id: int
    called_at: datetime
    outcome: str | None = None
    notes: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BusinessNoteCreate(BaseModel):
    body: str = Field(min_length=1)


class BusinessNoteRead(BaseModel):
    id: int
    business_id: int
    body: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeadImportRequest(BaseModel):
    source: str = Field(default="outscraper", min_length=1, max_length=50)
    keyword: str = Field(min_length=1, max_length=120)
    location: str = Field(min_length=1, max_length=120)


class LeadImportResponse(BaseModel):
    imported: int = Field(ge=0)
    updated: int = Field(ge=0)
    skipped: int = Field(ge=0)


class CrmDashboardStats(BaseModel):
    # Opportunity counts
    total_opportunities: int
    no_website: int
    facebook_only: int
    free_builder: int
    # Sales pipeline stats
    total_calls: int
    calls_today: int
    interested: int
    proposals_sent: int
    deals_won: int
    revenue_won: Decimal
    # Revenue intelligence
    avg_deal_value: Decimal
    revenue_this_month: Decimal
    revenue_last_30_days: Decimal
    call_to_interested_rate: int
    interested_to_proposal_rate: int
    proposal_to_won_rate: int


# Legacy alias kept for existing code paths
DashboardStats = CrmDashboardStats


class RevenueByMonth(BaseModel):
    month: str
    revenue: Decimal
    deals: int


class CategoryAnalytics(BaseModel):
    category: str
    opportunities: int
    won_deals: int
    revenue: Decimal


class MarketAnalytics(BaseModel):
    city: str
    total: int
    opportunities: int
    opportunity_rate: int
    revenue_won: Decimal


class SearchRequest(BaseModel):
    country: str = Field(min_length=1, max_length=120)
    city: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=120)
    provider: str = Field(min_length=1, max_length=50)
    radius_km: int = Field(default=0, ge=0, le=50)
    expand_neighbors: bool = Field(default=False)
    expand_keywords: bool = Field(default=True)


class SearchResultLead(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    website_status: WebsiteStatus
    address: str | None = None
    city: str | None = None
    country: str | None = None
    category: str | None = None
    rating: Decimal | None = Field(default=None, ge=0, le=5)
    review_count: int = Field(default=0, ge=0)
    lead_score: int = Field(default=0, ge=0)
    opportunity_reason: str
    google_maps_url: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    linkedin_url: str | None = None


class SearchAnalytics(BaseModel):
    raw_count: int
    deduped_count: int
    opportunities: int
    no_website: int
    facebook_only: int
    free_builder: int
    cities_searched: list[str]
    keywords_used: list[str]


class SearchResponse(BaseModel):
    leads: list[SearchResultLead]
    analytics: SearchAnalytics


class BatchImportRequest(BaseModel):
    leads: list[SearchResultLead]


OutscraperImportRequest = LeadImportRequest
OutscraperImportResponse = LeadImportResponse
