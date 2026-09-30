from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sorteio Instagram - Lideres Jr."
    app_env: str = "development"
    app_debug: bool = False
    app_cors_origins: list[str] = ["http://localhost:5173"]
    instagram_access_token: str | None = None
    instagram_media_id: str | None = None
    instagram_api_version: str = "v24.0"
    storage_backend: Literal["memory", "supabase"] = "memory"
    supabase_url: str | None = None
    supabase_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    @field_validator("app_cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()

