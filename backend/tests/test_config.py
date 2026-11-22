from pathlib import Path
from typing import Any, ClassVar

import pytest

from app.config import Settings


def test_settings_load_repository_root_env_and_use_documented_embedding_default() -> (
    None
):
    repository_root = Path(__file__).resolve().parents[2]

    assert Settings.model_config["env_file"] == repository_root / ".env"
    assert (
        Settings().embedding_model_name
        == "intfloat/multilingual-e5-base"
    )


def test_settings_accept_documented_jwt_names_and_psycopg3_url() -> None:
    jwt_stub = "unit-test-secret"
    settings = Settings(
        JWT_SECRET=jwt_stub,
        JWT_ALGORITHM="HS512",
        DATABASE_URL="postgresql://user:password@localhost/carnet",
    )

    assert settings.secret_key == "unit-test-secret"
    assert settings.algorithm == "HS512"
    assert settings.database_url.startswith("postgresql+psycopg://")


def test_settings_provide_bounded_gemini_request_timeout() -> None:
    assert Settings().gemini_request_timeout_ms == 60_000
    assert (
        Settings(GEMINI_REQUEST_TIMEOUT_MS=45_000).gemini_request_timeout_ms == 45_000
    )


def test_settings_read_optional_gemini_fallback_model() -> None:
    assert Settings(
        GEMINI_FALLBACK_MODEL="configured-fallback"
    ).gemini_fallback_model == ("configured-fallback")
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


def test_e5_query_encoder_adds_query_prefix() -> None:
    """encode_query must prepend 'query: ' when the model is intfloat/multilingual-e5-base."""
    import sys
    from pathlib import Path as _Path

    # Ensure rag package is importable from backend/ test runner.
    _repo_root = _Path(__file__).resolve().parents[2]
    if str(_repo_root) not in sys.path:
        sys.path.insert(0, str(_repo_root))

    from rag.compliance.embeddings import SentenceTransformerEncoder

    class _FakeModel:
        model_name = "intfloat/multilingual-e5-base"
        last_texts: ClassVar[list[str]] = []

        def encode(
            self,
            texts: list[str],
            batch_size: int = 32,
            convert_to_numpy: bool = True,
            normalize_embeddings: bool = True,
            show_progress_bar: bool = False,
        ) -> list[list[float]]:
            _FakeModel.last_texts = list(texts)
            return [[1.0] + [0.0] * 767 for _ in texts]

    encoder = SentenceTransformerEncoder(
        "intfloat/multilingual-e5-base", model=_FakeModel()
    )
    encoder.encode_query(["What is the tax rate?"])
    assert _FakeModel.last_texts, "encoder must call model.encode"
    assert _FakeModel.last_texts[0].startswith(
        "query: "
    ), f"expected 'query: ' prefix, got: {_FakeModel.last_texts[0]!r}"


def test_e5_query_parity_with_evaluation_path() -> None:
    """Backend and evaluation query-encoding paths must produce the same vector.

    Calls the REAL rag.evaluation.run_e2e.encode_query function alongside
    SentenceTransformerEncoder.encode_query on a shared recording fake model.
    Both paths receive the same text; the test asserts the vectors are identical.

    Uses a fake model so the test runs without network access or cached weights.
    Skipped if the rag package is not importable.
    """
    import sys
    from pathlib import Path as _Path

    _repo_root = _Path(__file__).resolve().parents[2]
    if str(_repo_root) not in sys.path:
        sys.path.insert(0, str(_repo_root))

    try:
        from rag.compliance.embeddings import SentenceTransformerEncoder
        from rag.evaluation.run_e2e import encode_query as eval_encode_query
    except ImportError as exc:
        pytest.skip(f"rag package not importable: {exc}")

    # A recording fake that stores every prefixed text it receives.
    class _RecordingModel:
        model_name = "intfloat/multilingual-e5-base"
        _recorded: ClassVar[dict[str, list[float]]] = {}

        @staticmethod
        def _make_vector(text: str) -> list[float]:
            import math
            seed = sum(ord(c) * (i + 1) for i, c in enumerate(text)) % 10_000
            raw = [math.sin(seed + i) for i in range(768)]
            norm = math.sqrt(sum(v * v for v in raw)) or 1.0
            return [v / norm for v in raw]

        def encode(
            self,
            texts: list[str],
            batch_size: int = 32,
            convert_to_numpy: bool = True,
            normalize_embeddings: bool = True,
            show_progress_bar: bool = False,
        ) -> Any:
            import numpy as np

            result = []
            for t in texts:
                vec = self._make_vector(t)
                _RecordingModel._recorded[t] = vec
                result.append(vec)
            if convert_to_numpy:
                return np.array(result)
            return result

    model_name = "intfloat/multilingual-e5-base"
    query_text = "What is the tax registration threshold for a small business?"

    # --- Backend path ---
    _RecordingModel._recorded = {}
    fake_for_backend = _RecordingModel()
    encoder = SentenceTransformerEncoder(model_name, model=fake_for_backend)
    backend_vectors = encoder.encode_query([query_text])
    backend_vec = list(backend_vectors[0])

    # --- Evaluation path (real function from run_e2e) ---
    # eval_encode_query(model, model_id, queries) -> list[list[float]]
    # It calls model.encode(prefixed_texts, normalize_embeddings=True, show_progress_bar=False)
    _RecordingModel._recorded = {}
    fake_for_eval = _RecordingModel()
    eval_vectors = eval_encode_query(fake_for_eval, model_name, [query_text])
    eval_vec = eval_vectors[0]

    # The backend and evaluation vectors are computed by the same fake model,
    # so they must be equal if and only if both paths called model.encode with
    # the identical prefixed text.
    assert backend_vec == pytest.approx(eval_vec, abs=1e-9), (
        "Backend and evaluation query vectors differ for the same text. "
        f"Backend recorded keys: {list(fake_for_backend._recorded)}, "
        f"Eval recorded keys: {list(fake_for_eval._recorded)}"
    )


@pytest.mark.slow
def test_e5_query_parity_with_real_weights() -> None:
    """Backend and evaluation encode_query produce the same vector on real weights.

    Marked slow; skipped when the model is not in the local cache so CI is not
    blocked.  Run manually after downloading models with rag/download_models.py.
    """
    import sys
    from pathlib import Path as _Path

    _repo_root = _Path(__file__).resolve().parents[2]
    if str(_repo_root) not in sys.path:
        sys.path.insert(0, str(_repo_root))

    model_name = "intfloat/multilingual-e5-base"
    cache_dir = _repo_root / "rag" / "cache" / "models"
    # Sentence-transformers stores downloads as models--<org>--<name>
    cache_slug = "models--" + model_name.replace("/", "--")
    if not (cache_dir / cache_slug).exists():
        pytest.skip(f"Model not cached at {cache_dir / cache_slug}")

    try:
        from rag.compliance.embeddings import SentenceTransformerEncoder
        from rag.evaluation.run_e2e import encode_query as eval_encode_query
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        pytest.skip(f"dependency not available: {exc}")

    model = SentenceTransformer(
        model_name, cache_folder=str(cache_dir), local_files_only=True
    )
    query_text = "What is the tax registration threshold for a small business?"

    # Backend path: SentenceTransformerEncoder wraps the loaded model.
    encoder = SentenceTransformerEncoder(model_name, model=model)
    backend_vec = list(encoder.encode_query([query_text])[0])

    # Evaluation path: real encode_query from run_e2e.
    eval_vec = eval_encode_query(model, model_name, [query_text])[0]

    assert len(backend_vec) == 768
    assert len(eval_vec) == 768
    assert backend_vec == pytest.approx(eval_vec, abs=1e-6), (
        "Backend and evaluation produce different vectors from real E5 weights. "
        "One of the two prefixing paths has diverged."
    )
