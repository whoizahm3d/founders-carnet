from functools import lru_cache
import json
import logging
import re
from pathlib import Path

from pydantic import AliasChoices, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


_REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
_VERIFICATION_CONFIG = json.loads(Path(__file__).with_name("verification_config.json").read_text(encoding="utf-8"))
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    app_name: str = "Founders Carnet API"
    app_env: str = Field(default="development", validation_alias="APP_ENV")
    rate_limit_enabled: bool = Field(default=True, validation_alias="RATE_LIMIT_ENABLED")
    rate_limit_storage_uri: str | None = Field(default=None, validation_alias="RATE_LIMIT_STORAGE_URI")
    auth_rate_limit_per_minute: int = Field(default=10, ge=1, le=1000, validation_alias="AUTH_RATE_LIMIT_PER_MINUTE")
    ai_rate_limit_per_minute: int = Field(default=20, ge=1, le=1000, validation_alias="AI_RATE_LIMIT_PER_MINUTE")
    cors_allowed_origins: str = Field(default="http://localhost:3000", validation_alias="CORS_ALLOWED_ORIGINS")
    linkedin_provider: str = Field(default="fake", validation_alias="LINKEDIN_PROVIDER")
    secret_key: str = Field(
        default="dev-secret-key-change-me",
        validation_alias=AliasChoices("JWT_SECRET", "SECRET_KEY"),
    )
    algorithm: str = Field(
        default="HS256",
        validation_alias=AliasChoices("JWT_ALGORITHM", "ALGORITHM"),
    )
    access_token_expire_minutes: int = 60 * 24
    database_url: str = Field(
        default="sqlite:///./app.db",
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
    )
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        validation_alias=AliasChoices("REDIS_URL", "redis_url"),
    )
    gemini_api_key: SecretStr | None = None
    firecrawl_api_key: SecretStr | None = None
    firecrawl_request_timeout_ms: int = Field(
        default=25_000,
        ge=5_000,
        le=55_000,
        validation_alias="FIRECRAWL_REQUEST_TIMEOUT_MS",
    )
    resume_storage_dir: Path = Field(
        default=_REPOSITORY_ROOT / "backend" / ".private" / "resumes",
        validation_alias="RESUME_STORAGE_DIR",
    )
    llm_cache_dir: Path = Field(
        default=_REPOSITORY_ROOT / "backend" / ".private" / "llm-cache",
        validation_alias="LLM_CACHE_DIR",
    )
    gemini_model: str = "gemini-2.5-flash"
    gemini_fallback_model: str | None = Field(
        default=None,
        validation_alias="GEMINI_FALLBACK_MODEL",
    )
    gemini_request_timeout_ms: int = Field(
        default=60_000,
        ge=10_000,
        le=120_000,
        validation_alias="GEMINI_REQUEST_TIMEOUT_MS",
    )
    embedding_model_name: str = _DEFAULT_EMBEDDING_MODEL
    compliance_top_k: int = 5
    compliance_minimum_similarity: float = 0.4
    verification_low_threshold: float = Field(default=_VERIFICATION_CONFIG["thresholds"]["low"], ge=0.0, le=1.0)
    verification_high_threshold: float = Field(default=_VERIFICATION_CONFIG["thresholds"]["high"], ge=0.0, le=1.0)
    verification_rule_version: str = _VERIFICATION_CONFIG["version"]
    verification_linkedin_weight: float = Field(default=_VERIFICATION_CONFIG["weights"]["linkedin"], ge=0.0, le=1.0)
    verification_secp_weight: float = Field(default=_VERIFICATION_CONFIG["weights"]["secp"], ge=0.0, le=1.0)
    verification_completeness_weight: float = Field(default=_VERIFICATION_CONFIG["weights"]["completeness"], ge=0.0, le=1.0)
    verification_github_weight: float = Field(default=_VERIFICATION_CONFIG["weights"]["github"], ge=0.0, le=1.0)
    verification_portfolio_weight: float = Field(default=_VERIFICATION_CONFIG["weights"]["portfolio"], ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_verification_thresholds(self) -> "Settings":
        if self.verification_high_threshold <= self.verification_low_threshold:
            raise ValueError("Verification high threshold must exceed the low threshold")
        weights = (
            self.verification_linkedin_weight,
            self.verification_secp_weight,
            self.verification_completeness_weight,
            self.verification_github_weight,
            self.verification_portfolio_weight,
        )
        if abs(sum(weights) - 1.0) > 0.0001:
            raise ValueError("Verification signal weights must sum to 1")
        if self.app_env.casefold() != "development" and (
            self.secret_key == "dev-secret-key-change-me" or len(self.secret_key) < 32
        ):
            raise ValueError("JWT_SECRET must be at least 32 characters and not the built-in default outside development")
        for model in (self.gemini_model, self.gemini_fallback_model):
            if model and _gemini_model_version(model) > (2, 5):
                logger.warning("Configured Gemini model %s is newer than the approved Gemini 2.5 tier", model)
        return self

    @field_validator("database_url", mode="before")
    @classmethod
    def select_installed_postgres_driver(cls, value: object) -> object:
        # requirements.txt installs psycopg 3, while bare postgresql:// selects psycopg2.
        if isinstance(value, str) and value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @field_validator("cors_allowed_origins")
    @classmethod
    def reject_wildcard_cors_origin(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        if "*" in origins:
            raise ValueError("CORS_ALLOWED_ORIGINS cannot contain '*' when credentials are enabled")
        return value

    @field_validator("gemini_model", mode="before")
    @classmethod
    def normalize_gemini_model(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or "gemini-2.5-flash"
        return value

    @field_validator("gemini_fallback_model", mode="before")
    @classmethod
    def normalize_gemini_fallback_model(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    model_config = SettingsConfigDict(
        env_file=_REPOSITORY_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


def _gemini_model_version(model: str) -> tuple[int, int]:
    match = re.search(r"gemini-(\d+)\.(\d+)", model.casefold())
    return (int(match.group(1)), int(match.group(2))) if match else (0, 0)
