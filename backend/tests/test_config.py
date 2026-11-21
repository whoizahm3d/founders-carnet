from pathlib import Path

from app.config import Settings


def test_settings_load_repository_root_env_and_use_documented_embedding_default() -> None:
    repository_root = Path(__file__).resolve().parents[2]

    assert Settings.model_config["env_file"] == repository_root / ".env"
    assert (
        Settings().embedding_model_name
        == "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
    )


def test_settings_accept_documented_jwt_names_and_psycopg3_url() -> None:
    settings = Settings(
        JWT_SECRET="unit-test-secret",
        JWT_ALGORITHM="HS512",
        DATABASE_URL="postgresql://user:password@localhost/carnet",
    )

    assert settings.secret_key == "unit-test-secret"
    assert settings.algorithm == "HS512"
    assert settings.database_url.startswith("postgresql+psycopg://")


def test_settings_provide_bounded_gemini_request_timeout() -> None:
    assert Settings().gemini_request_timeout_ms == 60_000
    assert Settings(GEMINI_REQUEST_TIMEOUT_MS=45_000).gemini_request_timeout_ms == 45_000


def test_settings_read_optional_gemini_fallback_model() -> None:
    assert Settings(GEMINI_FALLBACK_MODEL="configured-fallback").gemini_fallback_model == (
        "configured-fallback"
    )
    assert Settings(GEMINI_FALLBACK_MODEL="").gemini_fallback_model is None


def test_cors_settings_reject_wildcard_with_credentials() -> None:
    import pytest

    with pytest.raises(ValueError, match=r"cannot contain '\*'"):
        Settings(_env_file=None, CORS_ALLOWED_ORIGINS="*")


def test_verification_settings_load_versioned_config_and_validate_weights() -> None:
    import pytest

    settings = Settings(_env_file=None)
    assert settings.verification_rule_version == "verification-v3"
    assert sum((
        settings.verification_linkedin_weight,
        settings.verification_secp_weight,
        settings.verification_completeness_weight,
        settings.verification_github_weight,
        settings.verification_portfolio_weight,
    )) == pytest.approx(1.0)
    with pytest.raises(ValueError, match="weights must sum to 1"):
        Settings(
            _env_file=None,
            verification_linkedin_weight=0.2,
            verification_secp_weight=0.2,
            verification_completeness_weight=0.2,
            verification_github_weight=0.2,
            verification_portfolio_weight=0.3,
        )


def test_production_requires_long_nondefault_jwt_secret() -> None:
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(_env_file=None, APP_ENV="production")
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(_env_file=None, APP_ENV="production", JWT_SECRET="short")
    assert Settings(_env_file=None, APP_ENV="production", JWT_SECRET="s" * 32).app_env == "production"


def test_newer_gemini_primary_model_logs_policy_warning(caplog) -> None:
    settings = Settings(_env_file=None, gemini_model="gemini-3.0-flash")
    assert settings.gemini_model == "gemini-3.0-flash"
    assert any("newer than the approved Gemini 2.5 tier" in record.message for record in caplog.records)


def test_newer_gemini_fallback_model_logs_policy_warning(caplog) -> None:
    settings = Settings(_env_file=None, GEMINI_FALLBACK_MODEL="gemini-3.0-flash")
    assert settings.gemini_fallback_model == "gemini-3.0-flash"
    assert any("newer than the approved Gemini 2.5 tier" in record.message for record in caplog.records)


def test_gemini_default_uses_approved_25_flash_model() -> None:
    assert Settings(_env_file=None).gemini_model == "gemini-2.5-flash"
