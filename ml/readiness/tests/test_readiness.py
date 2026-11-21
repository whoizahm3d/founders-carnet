import json
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from schema import Assessment  # noqa: E402
from service import ReadinessError, generate_assessment  # noqa: E402

DIMS = [
    "problem_clarity", "market_definition", "differentiation",
    "business_model", "traction", "team", "scalability",
]


def make_dim(name, score=3):
    return {"dimension": name, "score": score,
            "reasoning": "Based on the profile.", "next_action": "Do one thing."}


def good_json(score=3):
    return json.dumps({"dimensions": [make_dim(d, score) for d in DIMS]})


class FakeLLM:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = 0

    def __call__(self, prompt):
        self.calls += 1
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


PROFILE = {"name": "Test", "problem": "x"}


def test_all_seven_dimensions_present():
    a = Assessment(dimensions=[make_dim(d) for d in DIMS])
    assert len(a.dimensions) == 7
    assert {d.dimension for d in a.dimensions} == set(DIMS)
    assert a.overall_score() == 3.0


def test_duplicate_dimension_rejected():
    dims = [make_dim(d) for d in DIMS]
    dims[6] = make_dim("problem_clarity")
    with pytest.raises(ValidationError):
        Assessment(dimensions=dims)


def test_missing_dimension_rejected():
    with pytest.raises(ValidationError):
        Assessment(dimensions=[make_dim(d) for d in DIMS[:6]])


@pytest.mark.parametrize("bad", [0, 6, -1])
def test_score_out_of_range_rejected(bad):
    dims = [make_dim(d) for d in DIMS]
    dims[0] = make_dim("problem_clarity", score=bad)
    with pytest.raises(ValidationError):
        Assessment(dimensions=dims)


def test_service_success_returns_versions_and_score():
    llm = FakeLLM([good_json(4)])
    result = generate_assessment(PROFILE, llm)
    assert result.overall_score == 4.0
    assert result.rubric_version == "v1"
    assert result.prompt_version == "v1"
    assert llm.calls == 1


def test_service_accepts_fenced_json():
    llm = FakeLLM(["```json\n" + good_json() + "\n```"])
    assert generate_assessment(PROFILE, llm).overall_score == 3.0


def test_service_retries_once_then_succeeds():
    llm = FakeLLM(["not json at all", good_json()])
    result = generate_assessment(PROFILE, llm)
    assert result.overall_score == 3.0
    assert llm.calls == 2


def test_failure_keeps_previous_assessment():
    previous = generate_assessment(PROFILE, FakeLLM([good_json(2)]))
    llm = FakeLLM(["garbage", RuntimeError("network down")])
    with pytest.raises(ReadinessError) as exc:
        generate_assessment(PROFILE, llm, previous=previous)
    assert exc.value.previous is previous
    assert llm.calls == 2