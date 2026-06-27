from fastapi import APIRouter

from app.api.v1.activity import router as activity_router
from app.api.v1.businesses import router as businesses_router
from app.api.v1.campaigns import router as campaigns_router
from app.api.v1.client_followups import router as client_followups_router
from app.api.v1.cloudtalk import router as cloudtalk_router
from app.api.v1.competitor import router as competitor_router
from app.api.v1.csv_import import router as csv_import_router
from app.api.v1.deals import router as deals_router
from app.api.v1.enrichment import router as enrichment_router
from app.api.v1.health import router as health_router
from app.api.v1.imports import router as imports_router
from app.api.v1.meeting_notes import router as meeting_notes_router
from app.api.v1.outreach import router as outreach_router
from app.api.v1.playbooks import router as playbooks_router
from app.api.v1.preview_csv import router as preview_csv_router
from app.api.v1.proposals import router as proposals_router
from app.api.v1.providers import router as providers_router
from app.api.v1.sales_insights import router as sales_insights_router
from app.api.v1.search import router as search_router
from app.api.v1.workspace import router as workspace_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(activity_router, tags=["activity"])
api_router.include_router(businesses_router, prefix="/businesses", tags=["businesses"])
api_router.include_router(campaigns_router)
api_router.include_router(client_followups_router, tags=["client-followups"])
api_router.include_router(cloudtalk_router, tags=["cloudtalk"])
api_router.include_router(competitor_router, tags=["businesses"])
api_router.include_router(deals_router, tags=["deals"])
api_router.include_router(enrichment_router, tags=["enrichment"])
api_router.include_router(imports_router, tags=["imports"])
api_router.include_router(csv_import_router, tags=["imports"])
api_router.include_router(meeting_notes_router, tags=["businesses"])
api_router.include_router(outreach_router, tags=["outreach"])
api_router.include_router(playbooks_router, tags=["playbooks"])
api_router.include_router(proposals_router, tags=["projects"])
api_router.include_router(providers_router, tags=["providers"])
api_router.include_router(sales_insights_router, tags=["businesses"])
api_router.include_router(search_router, tags=["lead-finder"])
api_router.include_router(preview_csv_router, tags=["lead-finder"])
api_router.include_router(workspace_router, tags=["workspace"])
