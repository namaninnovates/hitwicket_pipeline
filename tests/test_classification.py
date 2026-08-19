"""
Tests for LLM classification output validation and malformed JSON handling.
"""

import pytest
import json
from src.classification.validator import ClassificationOutput, FALLBACK_CLASSIFICATION
from src.classification.classifier import _extract_json, _rule_based_classify
from pydantic import ValidationError


class TestClassificationValidator:
    """Test Pydantic validation of classification outputs."""

    def test_valid_classification_passes(self):
        data = {
            "primary_category": "Monetization",
            "subcategory": "Pay-to-win pressure",
            "sentiment": "negative",
            "severity": 5,
            "business_impact": 5,
            "issue": "Player feels forced to spend to compete",
            "actionability": 4,
            "confidence": 0.92,
        }
        result = ClassificationOutput(**data)
        assert result.primary_category == "Monetization"
        assert result.sentiment == "negative"
        assert result.severity == 5

    def test_invalid_category_raises_error(self):
        data = {
            "primary_category": "InvalidCategory",
            "subcategory": "something",
            "sentiment": "negative",
            "severity": 3,
            "business_impact": 3,
            "issue": "Some issue",
            "actionability": 3,
            "confidence": 0.8,
        }
        with pytest.raises(ValidationError):
            ClassificationOutput(**data)

    def test_invalid_sentiment_raises_error(self):
        data = {
            "primary_category": "Gameplay",
            "subcategory": "Match / mechanics",
            "sentiment": "angry",  # Invalid
            "severity": 4,
            "business_impact": 4,
            "issue": "Some issue",
            "actionability": 3,
            "confidence": 0.8,
        }
        with pytest.raises(ValidationError):
            ClassificationOutput(**data)

    def test_severity_out_of_range_raises_error(self):
        data = {
            "primary_category": "Gameplay",
            "subcategory": "Match / mechanics",
            "sentiment": "negative",
            "severity": 6,  # Max is 5
            "business_impact": 3,
            "issue": "Some issue",
            "actionability": 3,
            "confidence": 0.8,
        }
        with pytest.raises(ValidationError):
            ClassificationOutput(**data)

    def test_severity_zero_raises_error(self):
        data = {
            "primary_category": "Experience",
            "subcategory": "Bugs / crashes",
            "sentiment": "negative",
            "severity": 0,  # Min is 1
            "business_impact": 3,
            "issue": "Crash on startup",
            "actionability": 5,
            "confidence": 0.85,
        }
        with pytest.raises(ValidationError):
            ClassificationOutput(**data)

    def test_confidence_clamped_to_0_1(self):
        """Confidence values outside [0,1] should be clamped, not raise errors."""
        data = {
            "primary_category": "Experience",
            "subcategory": "Performance",
            "sentiment": "negative",
            "severity": 3,
            "business_impact": 3,
            "issue": "Game lags badly",
            "actionability": 4,
            "confidence": 1.5,  # Above 1.0 — should be clamped
        }
        result = ClassificationOutput(**data)
        assert result.confidence == 1.0

    def test_case_insensitive_category_matching(self):
        """Category matching should be case-insensitive."""
        data = {
            "primary_category": "gameplay",  # lowercase
            "subcategory": "Match / mechanics",
            "sentiment": "positive",
            "severity": 1,
            "business_impact": 1,
            "issue": "Fun mechanics",
            "actionability": 1,
            "confidence": 0.9,
        }
        result = ClassificationOutput(**data)
        assert result.primary_category == "Gameplay"

    def test_fallback_classification_is_valid(self):
        """The fallback classification should itself be valid."""
        assert FALLBACK_CLASSIFICATION.confidence == 0.0
        assert FALLBACK_CLASSIFICATION.primary_category in [
            "Gameplay", "Progression", "Monetization", "Experience", "Competition & Social"
        ]

    def test_empty_issue_raises_error(self):
        data = {
            "primary_category": "Gameplay",
            "subcategory": "Match / mechanics",
            "sentiment": "negative",
            "severity": 3,
            "business_impact": 3,
            "issue": "",  # Empty
            "actionability": 3,
            "confidence": 0.7,
        }
        with pytest.raises(ValidationError):
            ClassificationOutput(**data)


class TestJsonExtraction:
    """Test JSON extraction from various LLM response formats."""

    def test_clean_json_parses(self):
        raw = '{"primary_category": "Gameplay", "subcategory": "Match / mechanics", "sentiment": "negative", "severity": 3, "business_impact": 3, "issue": "Test", "actionability": 3, "confidence": 0.8}'
        result = _extract_json(raw)
        assert result is not None
        assert result["primary_category"] == "Gameplay"

    def test_json_in_markdown_code_block(self):
        raw = '```json\n{"primary_category": "Monetization", "subcategory": "Ads", "sentiment": "negative", "severity": 4, "business_impact": 4, "issue": "Too many ads", "actionability": 5, "confidence": 0.9}\n```'
        result = _extract_json(raw)
        assert result is not None
        assert result["primary_category"] == "Monetization"

    def test_json_surrounded_by_text(self):
        raw = 'Here is the classification:\n{"primary_category": "Experience", "subcategory": "Bugs / crashes", "sentiment": "negative", "severity": 5, "business_impact": 5, "issue": "Crashes on launch", "actionability": 5, "confidence": 0.95}\nPlease review.'
        result = _extract_json(raw)
        assert result is not None
        assert result["sentiment"] == "negative"

    def test_completely_invalid_json_returns_none(self):
        raw = "I cannot classify this review. It is unclear."
        result = _extract_json(raw)
        assert result is None

    def test_empty_string_returns_none(self):
        assert _extract_json("") is None

    def test_partial_json_returns_none(self):
        raw = '{"primary_category": "Gameplay"'  # Unclosed
        result = _extract_json(raw)
        assert result is None


class TestRuleBasedClassifier:
    """Test the fallback rule-based classifier."""

    def test_monetization_keywords_detected(self):
        review = {
            "game": "hitwicket",
            "review_text": "This game is pay to win garbage, everything costs money",
            "rating": 1,
        }
        result = _rule_based_classify(review)
        assert result.primary_category == "Monetization"
        assert result.sentiment == "negative"

    def test_positive_review_classified_positive(self):
        review = {
            "game": "hitwicket",
            "review_text": "Love the strategy elements. Best cricket game I have played.",
            "rating": 5,
        }
        result = _rule_based_classify(review)
        assert result.sentiment == "positive"
        assert result.severity == 1

    def test_crash_detected_as_experience(self):
        review = {
            "game": "hitwicket",
            "review_text": "App keeps crashing every time I open it. Complete bug.",
            "rating": 1,
        }
        result = _rule_based_classify(review)
        assert result.primary_category == "Experience"

    def test_missing_fields_handled_gracefully(self):
        """Classifier should not crash on missing or None fields."""
        review = {
            "game": "hitwicket",
            "review_text": None,
            "rating": None,
        }
        result = _rule_based_classify(review)
        assert result is not None  # Should not raise
