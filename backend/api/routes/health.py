"""Health-check endpoint."""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    """Public health-check response."""

    status: Literal["ok"]
    service: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Report that the API process is available.

    Returns:
        Stable service metadata without exposing environment or secrets.
    """

    return HealthResponse(
        status="ok",
        service="accessible-madrid-routing-api",
        version="0.1.0",
    )
