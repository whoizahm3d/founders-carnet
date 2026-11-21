from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import ensure_processing_consent, require_roles
from app.models import User
from app.rate_limiter import AI_LIMIT, limiter
from app.services.compliance_assistant import (
    ComplianceAnswerResult,
    ComplianceAnswerService,
    ComplianceServiceUnavailable,
)
from app.services.wiring import get_compliance_answer_service

router = APIRouter(prefix="/api/v1/compliance", tags=["compliance"])
FounderDep = Annotated[User, Depends(require_roles("founder"))]
SessionDep = Annotated[Session, Depends(get_db)]
ComplianceServiceDep = Annotated[
    ComplianceAnswerService,
    Depends(get_compliance_answer_service),
]


class ComplianceQuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)

    @field_validator("question")
    @classmethod
    def normalize_question(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Question must not be empty")
        return normalized


@router.post("/questions", response_model=ComplianceAnswerResult)
@limiter.limit(AI_LIMIT, error_message="Rate limit exceeded")
def ask_compliance_question(
    request: Request,
    payload: ComplianceQuestionRequest,
    current_user: FounderDep,
    session: SessionDep,
    service: ComplianceServiceDep,
) -> ComplianceAnswerResult:
    ensure_processing_consent(session, current_user.id)
    try:
        return service.ask(session, user_id=current_user.id, question=payload.question)
    except ComplianceServiceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Compliance assistant is temporarily unavailable",
        ) from exc
