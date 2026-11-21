from typing import Literal

from pydantic import BaseModel, Field, model_validator

Dimension = Literal[
    "problem_clarity",
    "market_definition",
    "differentiation",
    "business_model",
    "traction",
    "team",
    "scalability",
]


class DimensionScore(BaseModel):
    dimension: Dimension
    score: int = Field(ge=1, le=5)
    reasoning: str
    next_action: str


class Assessment(BaseModel):
    dimensions: list[DimensionScore]

    @model_validator(mode="after")
    def require_all_dimensions_once(self) -> "Assessment":
        expected = {
            "problem_clarity",
            "market_definition",
            "differentiation",
            "business_model",
            "traction",
            "team",
            "scalability",
        }
        actual = [item.dimension for item in self.dimensions]
        if set(actual) != expected or len(actual) != len(set(actual)):
            raise ValueError("All seven readiness dimensions must appear exactly once")
        return self

    def overall_score(self) -> float:
        return round(sum(item.score for item in self.dimensions) / 7, 2)
