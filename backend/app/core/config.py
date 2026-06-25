from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Lead CRM API", validation_alias="APP_NAME")
    environment: str = Field(default="production", validation_alias="ENVIRONMENT")
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")
    database_url: str = Field(validation_alias="DATABASE_URL")
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        validation_alias="CORS_ORIGINS",
    )
    google_maps_api_key: str | None = Field(default=None, validation_alias="GOOGLE_MAPS_API_KEY")
    google_maps_import_limit: int = Field(default=60, validation_alias="GOOGLE_MAPS_IMPORT_LIMIT")
    outscraper_api_key: str | None = Field(default=None, validation_alias="OUTSCRAPER_API_KEY")
    outscraper_base_url: str = Field(
        default="https://api.app.outscraper.com",
        validation_alias="OUTSCRAPER_BASE_URL",
    )
    outscraper_import_limit: int = Field(default=50, validation_alias="OUTSCRAPER_IMPORT_LIMIT")
    cloudtalk_api_key: str | None = Field(default=None, validation_alias="CLOUDTALK_API_KEY")
    # Agent ID that the CRM uses to initiate outbound calls (required for POST /calls/create.json)
    cloudtalk_agent_id: int | None = Field(default=None, validation_alias="CLOUDTALK_AGENT_ID")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
