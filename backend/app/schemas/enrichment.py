from pydantic import BaseModel


class EnrichmentResult(BaseModel):
    business_id: int
    business_name: str
    email_found: bool
    facebook_found: bool
    instagram_found: bool
    linkedin_found: bool
    elapsed_seconds: float
    error: str | None = None


class EnrichmentJobStatus(BaseModel):
    running: bool
    paused: bool
    total: int
    processed: int
    emails_found: int
    facebook_found: int
    instagram_found: int
    linkedin_found: int
    youtube_found: int = 0
    tiktok_found: int = 0
    contact_forms_found: int = 0
    errors: int = 0
    retry_count: int = 0
    eta_seconds: float | None = None
    rate_limit_delay: float = 1.0
    elapsed_seconds: float
    current_business: str | None
    # aggregate DB stats
    total_businesses: int
    enriched_businesses: int
    total_emails: int
    total_facebook: int
    total_instagram: int
    total_linkedin: int
    total_youtube: int = 0
    total_tiktok: int = 0
