from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models import User
from app.security import hash_password


client = TestClient(app)


def _token(email: str, role: str) -> dict[str, str]:
    created = client.post(f"/api/v1/auth/register/{role}", json={
        "email": email, "password": "SecurePass123!", "full_name": role.title(), "consent_accepted": True,
    })
    assert created.status_code == 201, created.text
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "SecurePass123!"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _admin_token(email: str) -> dict[str, str]:
    generator = app.dependency_overrides[get_db]()
    session = next(generator)
    session.add(User(email=email, full_name="Admin Reviewer", hashed_password=hash_password("SecurePass123!"), role="admin"))
    session.commit()
    try:
        next(generator)
    except StopIteration:
        pass
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "SecurePass123!"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _startup(headers: dict[str, str]) -> dict[str, object]:
    profile = client.put("/api/v1/founders/me/profile", headers=headers, json={"consent_accepted": True})
    assert profile.status_code == 200, profile.text
    result = client.post("/api/v1/founders/me/startups", headers=headers, json={
        "name": "Verification Startup", "description": "A local commerce platform.", "sector": "commerce",
        "stage": "mvp", "location": "Lahore", "business_model": "subscription",
        "traction_summary": "Pilot customers", "customer_count": 5,
    })
    assert result.status_code == 201, result.text
    return result.json()


def test_only_owner_requests_and_admin_approval_unlocks_job_posting():
    founder = _token("startup-verify-founder@example.com", "founder")
    other = _token("startup-verify-other@example.com", "founder")
    admin = _admin_token("startup-verify-admin@example.com")
    startup = _startup(founder)
    path = f"/api/v1/founders/me/startups/{startup['id']}/verification-request"

    assert client.post(path, headers=other, json={"note": "Please review"}).status_code == 404
    requested = client.post(path, headers=founder, json={"note": "Company registration documents are ready."})
    assert requested.status_code == 201, requested.text
    assert client.get(path, headers=founder).json()["status"] == "pending"
    assert client.get("/api/v1/admin/startups/verification-queue", headers=founder).status_code == 403

    decision_path = f"/api/v1/admin/startups/{requested.json()['id']}/decision"
    assert client.post(decision_path, headers=founder, json={"decision": "approve", "reason": "Not admin"}).status_code == 403
    assert client.post(decision_path, headers=admin, json={"decision": "approve"}).status_code == 422
    approved = client.post(decision_path, headers=admin, json={"decision": "approve", "reason": "Records checked against the official source."})
    assert approved.status_code == 200, approved.text
    assert approved.json()["reviewed_by_user_id"]
    job = client.post(f"/api/v1/startups/{startup['id']}/jobs", headers=founder, json={
        "title": "Backend Engineer", "description": "Build API features.", "employment_type": "job", "location": "Lahore",
    })
    assert job.status_code == 201, job.text


def test_startup_verification_queue_and_decision_require_admin():
    founder = _token("startup-verify-queue-founder@example.com", "founder")
    startup = _startup(founder)
    submitted = client.post(
        f"/api/v1/founders/me/startups/{startup['id']}/verification-request",
        headers=founder,
        json={"note": "Ready for review"},
    )
    assert submitted.status_code == 201
    queue = client.get("/api/v1/admin/startups/verification-queue")
    assert queue.status_code == 401

