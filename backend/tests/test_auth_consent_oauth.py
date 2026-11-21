from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models import ConsentRecord

client = TestClient(app)


def _registration_payload(email: str) -> dict[str, object]:
    return {
        "email": email,
        "password": "SecurePass123!",
        "full_name": "Consent User",
        "consent_accepted": True,
    }


def test_registration_requires_explicit_consent_and_does_not_create_user():
    response = client.post(
        "/api/v1/auth/register/founder",
        json={
            **_registration_payload("no-consent@example.com"),
            "consent_accepted": False,
        },
    )

    assert response.status_code == 400
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": "no-consent@example.com", "password": "SecurePass123!"},
        ).status_code
        == 401
    )


def test_registration_role_is_in_path_and_admin_cannot_be_selected():
    response = client.post(
        "/api/v1/auth/register/admin",
        json=_registration_payload("admin-choice@example.com"),
    )

    assert response.status_code == 422
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": "admin-choice@example.com", "password": "SecurePass123!"},
        ).status_code
        == 401
    )


def test_consent_can_be_withdrawn_without_exposing_password_or_token():
    client.post(
        "/api/v1/auth/register/founder",
        json=_registration_payload("withdraw@example.com"),
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "withdraw@example.com", "password": "SecurePass123!"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = client.post("/api/v1/users/me/consent/withdraw", headers=headers)

    assert response.status_code == 200
    assert response.json()["withdrawn"] is True
    assert "access_token" not in response.text
    assert "SecurePass123!" not in response.text


def test_deletion_request_disables_account_invalidates_token_and_clears_llm_cache(
    monkeypatch,
):
    import app.main as main_module

    cleared_scopes = []
    monkeypatch.setattr(
        main_module,
        "clear_structured_response_cache",
        cleared_scopes.append,
        raising=False,
    )
    client.post(
        "/api/v1/auth/register/founder",
        json=_registration_payload("delete-me@example.com"),
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "delete-me@example.com", "password": "SecurePass123!"},
    )
    token = login.json()["access_token"]

    response = client.post(
        "/api/v1/users/me/deletion-request",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 202
    assert len(cleared_scopes) == 1
    assert isinstance(cleared_scopes[0], int)
    scheduled = datetime.fromisoformat(response.json()["deletion_scheduled_for"])
    assert scheduled > datetime.now(UTC).replace(tzinfo=None)
    assert (
        client.get(
            "/api/v1/users/me", headers={"Authorization": f"Bearer {token}"}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": "delete-me@example.com", "password": "SecurePass123!"},
        ).status_code
        == 401
    )


def test_fake_linkedin_provider_creates_identity_and_reuses_it():
    payload = {
        "authorization_code": "fake-linkedin-code",
        "consent_accepted": True,
    }
    first = client.post("/api/v1/auth/linkedin/talent", json=payload)
    second = client.post("/api/v1/auth/linkedin/talent", json=payload)

    assert first.status_code == 201, first.text
    assert second.status_code == 200, second.text
    assert first.json()["user"]["id"] == second.json()["user"]["id"]
    assert first.json()["user"]["role"] == "talent"
    assert first.json()["access_token"]
    assert first.json()["token_type"] == "bearer"


def test_linkedin_provider_configuration_rejects_unavailable_provider(monkeypatch):
    import app.main as main_module

    monkeypatch.setattr(main_module, "get_settings", lambda: type("Settings", (), {"linkedin_provider": "real"})())
    response = client.post(
        "/api/v1/auth/linkedin/founder",
        json={"authorization_code": "fake-linkedin-code", "consent_accepted": True},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Configured LinkedIn provider is unavailable"}


def test_consent_withdrawal_backfills_missing_record_as_withdrawn():

    headers = {"Authorization": f"Bearer {client.post('/api/v1/auth/login', json={'email':'missing-consent@example.com','password':'SecurePass123!'}).json().get('access_token', '')}"}
    if headers["Authorization"] == "Bearer ":
        client.post("/api/v1/auth/register/founder", json=_registration_payload("missing-consent@example.com"))
        login = client.post("/api/v1/auth/login", json={"email": "missing-consent@example.com", "password": "SecurePass123!"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    generator = app.dependency_overrides[get_db]()
    session = next(generator)
    user_id = client.get("/api/v1/users/me", headers=headers).json()["id"]
    session.query(ConsentRecord).filter(ConsentRecord.user_id == user_id).delete()
    session.commit()
    try:
        next(generator)
    except StopIteration:
        pass
    response = client.post("/api/v1/users/me/consent/withdraw", headers=headers)
    assert response.status_code == 200
    assert response.json()["withdrawn"] is True
    generator = app.dependency_overrides[get_db]()
    session = next(generator)
    record = session.query(ConsentRecord).filter(ConsentRecord.user_id == user_id).one()
    assert record.withdrawn_at is not None
    assert record.source == "backfill"
    try:
        next(generator)
    except StopIteration:
        pass


def test_withdrawn_consent_blocks_new_processing_but_keeps_own_reads_and_deletion():
    from app.services.feature_ai import get_gateway
    from app.services.portfolio_verification import get_portfolio_fetcher
    from app.services.web_search import get_market_search
    from app.services.wiring import get_compliance_answer_service

    class UnusedGateway:
        model_name = "test-model"

        def generate_structured(self, **_kwargs):
            raise AssertionError("Consent-gated endpoint reached an AI call")

    class UnusedService:
        def ask(self, *_args, **_kwargs):
            raise AssertionError("Consent-gated endpoint reached compliance processing")

    class UnusedProvider:
        def search(self, *_args, **_kwargs):
            raise AssertionError("Consent-gated endpoint reached web search")

        def fetch(self, *_args, **_kwargs):
            raise AssertionError("Consent-gated endpoint reached portfolio processing")

    app.dependency_overrides[get_gateway] = lambda: UnusedGateway()
    app.dependency_overrides[get_portfolio_fetcher] = lambda: UnusedProvider()
    app.dependency_overrides[get_market_search] = lambda: UnusedProvider()
    app.dependency_overrides[get_compliance_answer_service] = lambda: UnusedService()

    founder_registration = client.post(
        "/api/v1/auth/register/founder", json=_registration_payload("withdraw-processing-founder@example.com")
    )
    talent_registration = client.post(
        "/api/v1/auth/register/talent", json=_registration_payload("withdraw-processing-talent@example.com")
    )
    founder_login = client.post("/api/v1/auth/login", json={
        "email": "withdraw-processing-founder@example.com", "password": "SecurePass123!",
    })
    talent_login = client.post("/api/v1/auth/login", json={
        "email": "withdraw-processing-talent@example.com", "password": "SecurePass123!",
    })
    founder = {"Authorization": f"Bearer {founder_login.json()['access_token']}"}
    talent = {"Authorization": f"Bearer {talent_login.json()['access_token']}"}
    assert founder_registration.status_code == 201 and talent_registration.status_code == 201
    assert client.put("/api/v1/founders/me/profile", headers=founder, json={"consent_accepted": True}).status_code == 200
    startup = client.post("/api/v1/founders/me/startups", headers=founder, json={
        "name": "Consent Startup", "description": "Local commerce tool", "sector": "commerce", "stage": "mvp",
        "location": "Lahore", "business_model": "subscription", "traction_summary": "Pilot", "customer_count": 3,
    }).json()
    assert client.put("/api/v1/matching/me/profile", headers=talent, json={
        "consent_accepted": True, "sector": "commerce", "stages": ["mvp"], "skills": ["product"],
        "availability": "open", "location": "Lahore", "summary": "Product support.",
    }).status_code == 200
    assert client.put("/api/v1/talent/me/profile", headers=talent, json={"consent_accepted": True}).status_code == 200
    assert client.post("/api/v1/users/me/consent/withdraw", headers=founder).status_code == 200
    assert client.post("/api/v1/users/me/consent/withdraw", headers=talent).status_code == 200

    matching = client.get(f"/api/v1/matching/startups/{startup['id']}", headers=founder)
    assert matching.status_code == 403
    assert matching.json() == {"detail": "Consent withdrawn"}
    assert client.post(f"/api/v1/startups/{startup['id']}/readiness", headers=founder).status_code == 403
    assert client.post("/api/v1/pitch/sessions", headers=founder, json={"startup_id": startup["id"], "persona": "Investor"}).status_code == 403
    assert client.post("/api/v1/market-research", headers=founder, json={"startup_id": startup["id"], "question": "Market size?"}).status_code == 403
    assert client.post("/api/v1/compliance/questions", headers=founder, json={"question": "Registration steps?"}).status_code == 403
    assert client.post(
        "/api/v1/resumes/optimize?target_role=Engineer", headers={**talent, "Content-Type": "application/pdf", "X-Resume-Processing-Consent": "true"}, content=b"%PDF-1.4",
    ).status_code == 403
    assert client.post("/api/v1/verification/me", headers=talent, json={
        "processing_consent_accepted": True, "trust_notice_accepted": True, "portfolio_url": "https://example.org",
    }).status_code == 403
    assert client.get("/api/v1/matching/me/profile", headers=talent).status_code == 200
    assert client.get("/api/v1/talent/me/profile", headers=talent).status_code == 200
    assert client.put("/api/v1/matching/me/profile", headers=talent, json={
        "consent_accepted": True, "sector": "commerce", "stages": ["mvp"], "skills": ["product"],
        "availability": "open", "location": "Lahore", "summary": "Updated profile.",
    }).status_code == 403
    assert client.get("/api/v1/users/me", headers=founder).status_code == 200
    assert client.post("/api/v1/users/me/deletion-request", headers=founder).status_code == 202



def test_cors_preflight_allows_configured_origin_and_rejects_other_origin():
    allowed = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    rejected = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert rejected.status_code == 400
    assert "access-control-allow-origin" not in rejected.headers
