from functools import cached_property
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "sqlite+aiosqlite:///./vera.db"
    database_direct_url: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.8-flash"
    cors_origins: str = "http://localhost:5173"
    allowed_hosts: str = "localhost,127.0.0.1,testserver"
    rate_limit_per_minute: int = 30

    @field_validator("rate_limit_per_minute")
    @classmethod
    def positive_rate_limit(cls, value: int) -> int:
        if value < 1:
            raise ValueError("RATE_LIMIT_PER_MINUTE must be positive")
        return value

    @cached_property
    def origin_list(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]

    @cached_property
    def host_list(self) -> list[str]:
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
