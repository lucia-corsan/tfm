"""Top-level API router."""

from fastapi import APIRouter

from backend.api.routes.compare import router as compare_router
from backend.api.routes.health import router as health_router
from backend.api.routes.places import router as places_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(places_router)
api_router.include_router(compare_router)
