from types import SimpleNamespace

import app.services.feature_ai as feature_ai


def test_gateway_receives_configured_fallback_model(monkeypatch, tmp_path):
    settings = SimpleNamespace(
        gemini_api_key=SimpleNamespace(get_secret_value=lambda: "test-key"),
        gemini_model="primary-model",
        gemini_fallback_model="fallback-model",
        llm_cache_dir=tmp_path,
    )
    captured = {}

    def fake_gateway(**kwargs):
        captured.update(kwargs)
        return kwargs

    monkeypatch.setattr(feature_ai, "get_settings", lambda: settings)
    monkeypatch.setattr(feature_ai, "GeminiGateway", fake_gateway)
    feature_ai.get_gateway.cache_clear()

    try:
        feature_ai.get_gateway()
    finally:
        feature_ai.get_gateway.cache_clear()

    assert captured["model_name"] == "primary-model"
    assert captured["fallback_model"] == "fallback-model"
