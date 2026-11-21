from fastapi.testclient import TestClient

from app.main import app
from app.rate_limiter import limiter


def test_register_limit_returns_generic_429_without_internals():
    limiter.reset()
    limiter.enabled = True
    client = TestClient(app)
    try:
        responses = [
            client.post("/api/v1/auth/register/founder", json={
                "email": f"limit-{number}@example.com",
                "password": "SecurePass123!",
                "full_name": "Rate Limit User",
                "consent_accepted": True,
            })
            for number in range(11)
        ]
    finally:
        limiter.enabled = False
        limiter.reset()

    assert [response.status_code for response in responses[:10]] == [201] * 10
    assert responses[10].status_code == 429
    assert responses[10].json() == {"detail": "Rate limit exceeded"}
