"""
Pydantic model for validating LLM classification output.
"""

import sys
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import CATEGORIES, SENTIMENTS


class ClassificationOutput(BaseModel):
    """Validated classification result from the LLM."""

    primary_category: str
    subcategory: str
    sentiment: str
    severity: int
    business_impact: int
    issue: str
    actionability: int
    confidence: float

    @field_validator("primary_category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        # Allow case-insensitive matching
        for cat in CATEGORIES:
            if v.lower() == cat.lower():
                return cat
        # Fuzzy fallback: if contains key word
        v_lower = v.lower()
        for cat in CATEGORIES:
            if cat.lower().split()[0] in v_lower:
                return cat
        raise ValueError(f"Invalid primary_category: '{v}'. Must be one of {CATEGORIES}")

    @field_validator("sentiment")
    @classmethod
    def validate_sentiment(cls, v: str) -> str:
        v_lower = v.lower()
        if v_lower in SENTIMENTS:
            return v_lower
        raise ValueError(f"Invalid sentiment: '{v}'. Must be one of {SENTIMENTS}")

    @field_validator("severity", "business_impact", "actionability")
    @classmethod
    def validate_scale_1_5(cls, v: int) -> int:
        if not isinstance(v, (int, float)):
            raise ValueError(f"Expected int, got {type(v)}")
        v = int(v)
        if not (1 <= v <= 5):
            raise ValueError(f"Value {v} out of range [1, 5]")
        return v

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        v = float(v)
        return max(0.0, min(1.0, v))

    @field_validator("issue")
    @classmethod
    def validate_issue(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Issue cannot be empty")
        return v.strip()[:500]  # Cap at 500 chars


# Fallback values when classification fails
FALLBACK_CLASSIFICATION = ClassificationOutput(
    primary_category="Experience",
    subcategory="Bugs / crashes",
    sentiment="neutral",
    severity=2,
    business_impact=2,
    issue="Classification failed — review requires manual review",
    actionability=1,
    confidence=0.0,
)
