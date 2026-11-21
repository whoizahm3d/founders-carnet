"""Readiness score service (no DB, no gateway dependency).

The LLM call is injected as a function: llm_call(prompt: str) -> str (raw model text).
Backend wiring (llm_gateway + DB save) is done by passing a real llm_call and
storing the returned result.
"""
from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from prompt_v1 import PROMPT_VERSION, build_prompt
from pydantic import ValidationError
from schema import Assessment

RUBRIC_PATH = Path(__file__).with_name("rubric_v1.json")

LLMCall = Callable[[str], str]


class ReadinessError(Exception):
    """Raised when no valid assessment could be produced.

    Nothing is saved on failure. `previous` is the untouched earlier
    assessment (if any) so the caller can keep showing it and offer a retry.
    """

    def __init__(self, message: str, previous: AssessmentResult | None = None):
        super().__init__(message)
        self.previous = previous


@dataclass
class AssessmentResult:
    assessment: Assessment
    overall_score: float
    rubric_version: str
    prompt_version: str
    created_at: datetime


def load_rubric() -> dict:
    return json.loads(RUBRIC_PATH.read_text(encoding="utf-8"))


def _extract_json(text: str) -> dict:
    """Parse model output, tolerating ```json fences or stray text around the object."""
    text = text.strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("no JSON object found in model output")
    return json.loads(text[start : end + 1])


def generate_assessment(
    profile: dict,
    llm_call: LLMCall,
    previous: AssessmentResult | None = None,
    max_attempts: int = 2,
) -> AssessmentResult:
    rubric = load_rubric()
    base_prompt = build_prompt(profile, rubric)
    prompt = base_prompt
    last_error = "unknown error"

    for _ in range(max_attempts):
        try:
            raw = llm_call(prompt)
            assessment = Assessment(**_extract_json(raw))
        except (ValidationError, ValueError, TypeError) as exc:
            last_error = str(exc)
            prompt = (
                base_prompt
                + "\n\nYour previous answer was invalid: "
                + last_error[:500]
                + "\nReturn corrected JSON only, with all 7 dimensions exactly once."
            )
            continue
        except Exception as exc:  # noqa: BLE001 - any model/network failure
            last_error = f"model call failed: {exc}"
            continue

        return AssessmentResult(
            assessment=assessment,
            overall_score=assessment.overall_score(),
            rubric_version=rubric["rubric_version"],
            prompt_version=PROMPT_VERSION,
            created_at=datetime.now(UTC),
        )

    raise ReadinessError(
        f"could not produce a valid assessment after {max_attempts} attempts: {last_error}",
        previous=previous,
    )