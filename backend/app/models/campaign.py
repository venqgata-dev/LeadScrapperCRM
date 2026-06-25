from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, Numeric, String
from sqlalchemy.sql import func

from app.db.session import Base


class SearchCampaign(Base):
    __tablename__ = "search_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    country = Column(String(120), nullable=False)
    provider = Column(String(50), nullable=False)
    category = Column(String(255), nullable=False)
    category_group = Column(String(120), nullable=True)
    cities = Column(JSON, nullable=False, default=list)      # list[str]
    search_type = Column(String(20), nullable=False, default="custom")
    expand_keywords = Column(Boolean, nullable=False, default=True)
    expand_neighbors = Column(Boolean, nullable=False, default=False)
    auto_import = Column(Boolean, nullable=False, default=False)
    status = Column(String(20), nullable=False, default="Draft", index=True)

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    raw_results = Column(Integer, nullable=False, default=0)
    deduped_results = Column(Integer, nullable=False, default=0)
    opportunities = Column(Integer, nullable=False, default=0)
    imported = Column(Integer, nullable=False, default=0)

    api_requests = Column(Integer, nullable=False, default=0)
    estimated_cost = Column(Numeric(10, 6), nullable=False, default=0)

    # JSON blob updated by the background thread after each city for live progress
    progress_data = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
