import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.feature_ai import get_encoder, get_gateway
from app.services.portfolio_verification import get_portfolio_fetcher


client = TestClient(app)


class FakeEncoder:
    model_name = "test-encoder"

    def encode(self, texts):
        return [[0.1, 0.2, 0.3] for _ in texts]


def setup_function():
    app.dependency_overrides[get_encoder] = FakeEncoder


def teardown_function():
    app.dependency_overrides.pop(get_encoder, None)


class FakePortfolioFetcher:
    def fetch(self, _url):
        return "A product site for the fintech company described in the profile."


class FakeGateway:
    def __init__(self, result):
        self.result = result
        self.calls = 0

    def generate_structured(self, **_kwargs):
        from app.verification_schemas import PortfolioLinkAssessment

        self.calls += 1
        return PortfolioLinkAssessment.model_validate(self.result)


def create_user(email, role):
    created = client.post(f"/api/v1/auth/register/{role}", json={
        "email": email,
        "password": "SecurePass123!",
        "full_name": role.title(),
        "consent_accepted": True,
    })
    assert created.status_code == 201, created.text
    token = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "SecurePass123!",
    })
    return {"Authorization": f"Bearer {token.json()['access_token']}"}


def create_match_profile(headers):
    response = client.put("/api/v1/matching/me/profile", headers=headers, json={
        "consent_accepted": True,
        "sector": "fintech",
        "stages": ["mvp"],
        "skills": ["strategy"],
        "availability": "open",
        "location": "Lahore",
        "summary": "Mentor in fintech product strategy with startup experience.",
        "ticket_min": 0,
        "ticket_max": 0,
    })
    assert response.status_code == 200, response.text


def submit_verification(headers):
    return client.post("/api/v1/verification/me", headers=headers, json={
        "processing_consent_accepted": True,
        "trust_notice_accepted": True,
        "portfolio_url": "https://example.org/product",
        "secp_entity_name": "Example Technologies (Private) Limited",
        "secp_registration_number": "0123456",
    })


def install_verification_fakes(portfolio_result):
    app.dependency_overrides[get_portfolio_fetcher] = lambda: FakePortfolioFetcher()
    app.dependency_overrides[get_gateway] = lambda: FakeGateway(portfolio_result)


def test_profile_flow_scores_saves_status_and_requires_manual_secp_review():
    install_verification_fakes({"result": "consistent", "reason": "The page describes the stated fintech product."})
    headers = create_user("verify-investor@example.com", "investor")
    create_match_profile(headers)

    submitted = submit_verification(headers)
    assert submitted.status_code == 201, submitted.text
    body = submitted.json()
    assert body["band"] == "high"
    assert body["status"] == "auto_verified"
    assert body["score"] == 0.96
    assert body["signals"]["secp_cross_check"] == "pending_manual_review"
    assert body["signals"]["portfolio_link"] == "consistent"

    history = client.get("/api/v1/verification/me", headers=headers)
    assert history.status_code == 200
    assert history.json()["id"] == body["id"]

    appeal = client.post("/api/v1/verification/me/appeals", headers=headers, json={
        "reason": "The registration number belongs to our parent company.",
        "added_evidence": "The official registration certificate is available to the reviewer.",
    })
    assert appeal.status_code == 409


def test_auto_rejected_profile_can_appeal_once_and_report_locks_rescoring():
    install_verification_fakes({"result": "inconsistent", "reason": "The page describes a different business."})
    headers = create_user("verify-mentor@example.com", "mentor")
    create_match_profile(headers)
    submitted = submit_verification(headers)
    assert submitted.status_code == 201, submitted.text
    assert submitted.json()["status"] == "auto_rejected"

    appeal = client.post("/api/v1/verification/me/appeals", headers=headers, json={
        "reason": "The linked page is for our older product name.",
        "added_evidence": "The reviewer can compare this with the current product page.",
    })
    assert appeal.status_code == 201, appeal.text
    assert appeal.json()["status"] == "appeal_pending"
    assert client.post("/api/v1/verification/me/appeals", headers=headers, json={
        "reason": "Second appeal",
        "added_evidence": "Additional evidence",
    }).status_code == 409

    reporter = create_user("verify-reporter@example.com", "talent")
    reported = client.post(
        f"/api/v1/verification/profiles/{client.get('/api/v1/verification/me', headers=headers).json()['user_id']}/reports",
        headers=reporter,
        json={"reason": "Please review this profile evidence."},
    )
    assert reported.status_code == 201, reported.text
    assert reported.json()["status"] == "received"
    assert client.get("/api/v1/verification/me", headers=headers).json()["status"] == "appeal_pending"
    assert client.post("/api/v1/verification/me", headers=headers, json={
        "processing_consent_accepted": True,
        "trust_notice_accepted": True,
        "portfolio_url": "https://example.org/product",
        "secp_entity_name": "Example Technologies (Private) Limited",
        "secp_registration_number": "0123456",
    }).status_code == 409


def test_verification_requires_role_consent_profile_and_https_portfolio():
    install_verification_fakes({"result": "consistent", "reason": "Relevant product details are present."})
    founder = create_user("verify-founder@example.com", "founder")
    assert submit_verification(founder).status_code == 403

    investor = create_user("verify-consent@example.com", "investor")
    create_match_profile(investor)
    no_consent = client.post("/api/v1/verification/me", headers=investor, json={
        "processing_consent_accepted": False,
        "trust_notice_accepted": True,
        "portfolio_url": "https://example.org/product",
        "secp_entity_name": "Example Technologies",
        "secp_registration_number": "123",
    })
    assert no_consent.status_code == 400
    http_url = client.post("/api/v1/verification/me", headers=investor, json={
        "processing_consent_accepted": True,
        "trust_notice_accepted": True,
        "portfolio_url": "http://example.org/product",
        "secp_entity_name": "Example Technologies",
        "secp_registration_number": "123",
    })
    assert http_url.status_code == 422
    private_host = client.post("/api/v1/verification/me", headers=investor, json={
        "processing_consent_accepted": True,
        "trust_notice_accepted": True,
        "portfolio_url": "https://127.0.0.1/admin",
        "secp_entity_name": "Example Technologies",
        "secp_registration_number": "123",
    })
    assert private_host.status_code == 422


def test_portfolio_provider_failure_does_not_create_a_successful_verification():
    class FailedFetcher:
        def fetch(self, _url):
            raise RuntimeError("provider unavailable")

    app.dependency_overrides[get_portfolio_fetcher] = lambda: FailedFetcher()
    headers = create_user("verify-failed@example.com", "mentor")
    create_match_profile(headers)
    result = submit_verification(headers)
    assert result.status_code == 503
    assert client.get("/api/v1/verification/me", headers=headers).status_code == 404


def test_empty_portfolio_page_is_insufficient_and_does_not_claim_a_match():
    fetcher = FakePortfolioFetcher()
    fetcher.fetch = lambda _url: ""
    gateway = FakeGateway({"result": "consistent", "reason": "Unused when page has no content."})
    app.dependency_overrides[get_portfolio_fetcher] = lambda: fetcher
    app.dependency_overrides[get_gateway] = lambda: gateway
    headers = create_user("verify-empty-page@example.com", "investor")
    create_match_profile(headers)

    result = submit_verification(headers)
    assert result.status_code == 201, result.text
    assert result.json()["signals"]["portfolio_link"] == "insufficient"
    assert result.json()["status"] == "pending_review"
    assert gateway.calls == 0


def test_thresholds_must_be_ordered():
    from pydantic import ValidationError

    from app.config import Settings

    with pytest.raises(ValidationError):
        Settings(_env_file=None, verification_low_threshold=0.9, verification_high_threshold=0.8)


def test_stored_signal_rows_reproduce_total_score_for_mentor_investor_and_talent():
    from app.database import get_db
    from app.feature_models import ProfileVerification, VerificationSignal

    install_verification_fakes({"result": "consistent", "reason": "The portfolio supports the submitted profile."})
    for role in ("mentor", "investor", "talent"):
        headers = create_user(f"signal-score-{role}@example.com", role)
        create_match_profile(headers)
        if role == "talent":
            assert client.put("/api/v1/talent/me/profile", headers=headers, json={
                "consent_accepted": True, "github_url": "https://github.com/founder",
            }).status_code == 200
        payload = {
            "processing_consent_accepted": True,
            "trust_notice_accepted": True,
            "portfolio_url": "https://example.org/product",
        }
        if role != "talent":
            payload.update({"secp_entity_name": "Example Technologies", "secp_registration_number": "123"})
        submitted = client.post("/api/v1/verification/me", headers=headers, json=payload)
        assert submitted.status_code == 201, submitted.text

        generator = app.dependency_overrides[get_db]()
        session = next(generator)
        case = session.query(ProfileVerification).filter_by(user_id=submitted.json()["user_id"]).one()
        rows = session.query(VerificationSignal).filter_by(verification_id=case.id).all()
        assert {row.signal_name for row in rows} == {
            "linkedin_oauth", "secp_cross_check", "profile_completeness", "github_for_talent", "portfolio_link",
        }
        weights = {
            "linkedin_oauth": 0.03, "secp_cross_check": 0.02, "profile_completeness": 0.65,
            "github_for_talent": 0.10, "portfolio_link": 0.20,
        }
        assert sum(weights[row.signal_name] * row.score for row in rows) == pytest.approx(case.score, abs=0.0001)
        if role == "talent":
            secp = next(row for row in rows if row.signal_name == "secp_cross_check")
            assert (secp.outcome, secp.score) == ("not_provided", 0.0)
        try:
            next(generator)
        except StopIteration:
            pass


def test_complete_consistent_profile_auto_verifies_without_linkedin_and_incomplete_stays_pending():
    install_verification_fakes({"result": "consistent", "reason": "The portfolio supports the submitted profile."})
    complete = create_user("verify-complete@example.com", "mentor")
    create_match_profile(complete)
    submitted = submit_verification(complete)
    assert submitted.status_code == 201, submitted.text
    assert submitted.json()["status"] == "auto_verified"
    assert submitted.json()["signals"]["secp_cross_check"] == "pending_manual_review"

    incomplete = create_user("verify-incomplete@example.com", "mentor")
    assert client.put("/api/v1/matching/me/profile", headers=incomplete, json={
        "consent_accepted": True, "sector": "fintech", "stages": ["mvp"], "skills": ["strategy"],
        "availability": "open", "location": "Lahore", "summary": "Incomplete mentor profile.",
    }).status_code == 200
    response = submit_verification(incomplete)
    assert response.status_code == 201
    assert response.json()["status"] == "pending_review"


def test_report_and_block_preserve_rejected_and_appeal_pending_states():
    install_verification_fakes({"result": "inconsistent", "reason": "The page describes a different business."})
    target = create_user("verify-block-target@example.com", "mentor")
    create_match_profile(target)
    rejected = submit_verification(target)
    assert rejected.status_code == 201
    target_id = rejected.json()["user_id"]
    reporter = create_user("verify-block-reporter@example.com", "talent")
    block = client.post(
        f"/api/v1/verification/profiles/{target_id}/block", headers=reporter,
        json={"reason": "This profile needs an identity review."},
    )
    assert block.status_code == 201, block.text
    assert client.get("/api/v1/verification/me", headers=target).json()["status"] == "auto_rejected"
    duplicate = client.post(
        f"/api/v1/verification/profiles/{target_id}/block", headers=reporter,
        json={"reason": "This profile needs another review."},
    )
    assert duplicate.status_code == 409
    self_block = client.post(
        f"/api/v1/verification/profiles/{client.get('/api/v1/users/me', headers=reporter).json()['id']}/block",
        headers=reporter, json={"reason": "This profile needs a review."},
    )
    assert self_block.status_code == 400


def test_block_moves_verified_profile_to_review_and_locks_rescore():
    install_verification_fakes({"result": "consistent", "reason": "The portfolio supports the submitted profile."})
    target = create_user("verify-block-verified-target@example.com", "investor")
    create_match_profile(target)
    submitted = submit_verification(target)
    assert submitted.status_code == 201
    reporter = create_user("verify-block-verified-reporter@example.com", "founder")
    response = client.post(
        f"/api/v1/verification/profiles/{submitted.json()['user_id']}/block",
        headers=reporter,
        json={"reason": "Please review identity evidence."},
    )
    assert response.status_code == 201, response.text
    current = client.get("/api/v1/verification/me", headers=target).json()
    assert current["status"] == "pending_review"
    assert current["rescore_locked"] is True
