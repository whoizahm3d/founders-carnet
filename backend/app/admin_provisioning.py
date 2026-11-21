from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import REGISTRATION_CONSENT_TYPE, REGISTRATION_CONSENT_VERSION
from app.models import ConsentRecord, User
from app.security import hash_password


def create_admin(session: Session, email: str, full_name: str, password: str) -> User:
    normalized_email = email.strip().lower()
    if session.scalar(select(User.id).where(User.email == normalized_email)) is not None:
        raise ValueError("A user with that email already exists")
    user = User(
        email=normalized_email,
        full_name=full_name.strip(),
        hashed_password=hash_password(password),
        role="admin",
        is_active=True,
    )
    session.add(user)
    session.flush()
    session.add(
        ConsentRecord(
            user_id=user.id,
            consent_type=REGISTRATION_CONSENT_TYPE,
            consent_version=REGISTRATION_CONSENT_VERSION,
            source="admin_cli",
        )
    )
    session.commit()
    session.refresh(user)
    return user
