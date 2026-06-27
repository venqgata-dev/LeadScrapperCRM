from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SalesInsightRead(BaseModel):
    id: int
    business_id: int
    overall_score: int = 0
    priority: str = "MEDIUM"
    website_score: int = 0
    seo_score: int = 0
    trust_score: int = 0
    contact_score: int = 0
    social_score: int = 0
    opportunity_score: int = 0
    pain_points: list = []
    strengths: list = []
    recommendations: list = []
    recommended_services: list = []
    recommended_pitch: str | None = None
    next_best_action: str | None = None
    estimated_project_value: int = 0
    estimated_close_probability: int = 0
    talking_points: list | None = None
    objection_responses: dict | None = None
    opportunity_report: dict | None = None
    generated_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
