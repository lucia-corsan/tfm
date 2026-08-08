"""Application configuration loaded from environment variables."""

from functools import lru_cache
from typing import Literal, Optional

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    routing_provider: Literal["fixture", "ors"] = "fixture"
    ors_api_key: Optional[SecretStr] = None


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings.

    Returns:
        Validated settings loaded from the environment and local `.env` file.
    """

    return Settings()
