"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from pydantic import Field, SecretStr
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
    ors_timeout_seconds: float = Field(default=20.0, gt=0.0, le=120.0)
    ors_cache_dir: Path = Path("data/raw/ors")
    osm_snapshot_path: Path = Path(
        "data/raw/osm-routing/moncloa_principe_pio.snapshot.json"
    )


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings.

    Returns:
        Validated settings loaded from the environment and local `.env` file.
    """

    return Settings()
