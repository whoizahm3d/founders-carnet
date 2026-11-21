import pytest
from conftest import TestSessionLocal

from app.admin_provisioning import create_admin
from app.models import ConsentRecord, User


def test_admin_cli_provisioning_creates_admin_and_consent_record():
    with TestSessionLocal() as session:
        admin = create_admin(session, "Admin@Example.com", "Admin Person", "StrongAdminPass123!")
        assert admin.role == "admin"
        assert admin.email == "admin@example.com"
        consent = session.query(ConsentRecord).filter(ConsentRecord.user_id == admin.id).one()
        assert consent.source == "admin_cli"
        assert session.query(User).filter(User.role == "admin").count() == 1


def test_admin_cli_provisioning_refuses_existing_email():
    with TestSessionLocal() as session:
        session.add(User(email="existing@example.com", full_name="Existing", hashed_password="hash", role="founder"))
        session.commit()
        with pytest.raises(ValueError, match="already exists"):
            create_admin(session, "existing@example.com", "Admin", "StrongAdminPass123!")
