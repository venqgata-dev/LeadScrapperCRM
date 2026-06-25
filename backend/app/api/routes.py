from fastapi import APIRouter

from app.api.v1.businesses import router as businesses_router
from app.api.v1.csv_import import router as csv_import_router
from app.api.v1.health import router as health_router
from app.api.v1.imports import router as imports_router
from app.api.v1.providers import router as providers_router
from app.api.v1.preview_csv import router as preview_csv_router
from app.api.v1.search import router as search_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(businesses_router, prefix="/businesses", tags=["businesses"])
api_router.include_router(imports_router, tags=["imports"])
api_router.include_router(csv_import_router, tags=["imports"])
api_router.include_router(providers_router, tags=["providers"])
api_router.include_router(search_router, tags=["lead-finder"])
api_router.include_router(preview_csv_router, tags=["lead-finder"])
