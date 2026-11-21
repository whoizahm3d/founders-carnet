from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class StartupVerificationRequestWrite(BaseModel):
    note: str = Field(min_length=1, max_length=2000)

    @field_validator("note")
    @classmethod
    def require_nonblank_note(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Note cannot be blank")
        return value


class StartupVerificationDecisionWrite(BaseModel):
    decision: Literal["approve", "reject"]
    reason: str = Field(min_length=1, max_length=2000)

    @field_validator("reason")
    @classmethod
    def require_nonblank_reason(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Reason cannot be blank")
        return value


class StartupVerificationRead(BaseModel):
    id: int
    startup_id: int
    status: Literal["pending", "approved", "rejected"]
    note: str
    reason: str | None
    reviewed_by_user_id: int | None
    created_at: datetime
    reviewed_at: datetime | None

    model_config = {"from_attributes": True}
