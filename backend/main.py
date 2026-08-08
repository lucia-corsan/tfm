"""FastAPI application entry point."""

from fastapi import FastAPI

from backend.api.router import api_router


def create_app() -> FastAPI:
    """Build the FastAPI application.

    Returns:
        Configured FastAPI application.
    """

    application = FastAPI(
        title="Accessible Madrid Routing API",
        description=(
            "Compares pedestrian routes by profile fit, confidence, uncertainty, and reasons."
        ),
        version="0.1.0",
    )
    application.include_router(api_router, prefix="/api/v1")
    return application


app = create_app()
