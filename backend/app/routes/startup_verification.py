from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.feature_models import StartupVerificationRequest
from app.models import FounderProfile, Startup, User
from app.startup_verification_schemas import (
    StartupVerificationDecisionWrite,
    StartupVerificationRead,
    StartupVerificationRequestWrite,
)

router = APIRouter(prefix="/api/v1", tags=["startup verification"])
FounderDep = Annotated[User, Depends(require_roles("founder"))]
AdminDep = Annotated[User, Depends(require_roles("admin"))]
SessionDep = Annotated[Session, Depends(get_db)]


@router.post(
    "/founders/me/startups/{startup_id}/verification-request",
    response_model=StartupVerificationRead,
    status_code=status.HTTP_201_CREATED,
)
def request_startup_verification(
    startup_id: int, payload: StartupVerificationRequestWrite, user: FounderDep, session: SessionDep
) -> StartupVerificationRequest:
    startup = session.scalar(
        select(Startup).join(FounderProfile).where(Startup.id == startup_id, FounderProfile.user_id == user.id)
    )
    if startup is None:
        raise HTTPException(status_code=404, detail="Startup not found")
    pending = session.scalar(
        select(StartupVerificationRequest).where(
            StartupVerificationRequest.startup_id == startup_id,
            StartupVerificationRequest.status == "pending",
        )
    )
    if pending is not None:
        raise HTTPException(status_code=409, detail="A verification request is already open")
    request = StartupVerificationRequest(startup_id=startup_id, note=payload.note.strip())
    session.add(request)
    session.commit()
    session.refresh(request)
    return request


@router.get(
    "/founders/me/startups/{startup_id}/verification-request",
    response_model=StartupVerificationRead,
)
def read_startup_verification(
    startup_id: int, user: FounderDep, session: SessionDep
) -> StartupVerificationRequest:
    startup = session.scalar(
        select(Startup).join(FounderProfile).where(Startup.id == startup_id, FounderProfile.user_id == user.id)
    )
    if startup is None:
        raise HTTPException(status_code=404, detail="Startup not found")
    request = session.scalar(
        select(StartupVerificationRequest)
        .where(StartupVerificationRequest.startup_id == startup_id)
        .order_by(StartupVerificationRequest.created_at.desc(), StartupVerificationRequest.id.desc())
    )
    if request is None:
        raise HTTPException(status_code=404, detail="Verification request not found")
    return request


@router.get("/admin/startups/verification-queue", response_model=list[StartupVerificationRead])
def startup_verification_queue(_: AdminDep, session: SessionDep) -> list[StartupVerificationRequest]:
    return list(
        session.scalars(
            select(StartupVerificationRequest)
            .where(StartupVerificationRequest.status == "pending")
            .order_by(StartupVerificationRequest.created_at, StartupVerificationRequest.id)
        ).all()
    )


@router.post(
    "/admin/startups/{request_id}/decision",
    response_model=StartupVerificationRead,
)
def decide_startup_verification(
    request_id: int, payload: StartupVerificationDecisionWrite, user: AdminDep, session: SessionDep
) -> StartupVerificationRequest:
    request = session.get(StartupVerificationRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Verification request not found")
    if request.status != "pending":
        raise HTTPException(status_code=409, detail="Verification request is already decided")
    request.status = "approved" if payload.decision == "approve" else "rejected"
    request.reason = payload.reason.strip()
    request.reviewed_by_user_id = user.id
    request.reviewed_at = datetime.now(UTC).replace(tzinfo=None)
    startup = session.get(Startup, request.startup_id)
    if startup is not None:
        startup.is_verified = payload.decision == "approve"
    session.commit()
    session.refresh(request)
    return request
