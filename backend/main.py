"""FastAPI application entry point."""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.api.models import ApiErrorCode, ErrorResponse
from backend.api.router import api_router


async def invalid_request_handler(
    _request: Request,
    _error: RequestValidationError,
) -> JSONResponse:
    """Return a stable validation error without echoing submitted values."""

    error = ErrorResponse(code=ApiErrorCode.INVALID_REQUEST)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error.model_dump(mode="json"),
    )


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
    application.add_exception_handler(RequestValidationError, invalid_request_handler)
    application.include_router(api_router, prefix="/api/v1")
    return application


app = create_app()
