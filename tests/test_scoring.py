"""
Tests for the priority scoring formula.
Verifies mathematical correctness, normalization, and edge cases.
"""

import pytest
from src.scoring.priority import (
    _normalize_severity,
    _normalize_business_impact,
    _normalize_trend,
    _compute_trend,
    compute_priority_scores,
    split_by_period,
)
from src.config import (
    SCORE_WEIGHT_FREQUENCY,
    SCORE_WEIGHT_SEVERITY,
    SCORE_WEIGHT_BUSINESS_IMPACT,
    SCORE_WEIGHT_TREND,
    MIN_TREND_SAMPLE,
)


class TestNormalization:
    """Test individual normalization functions."""

    def test_severity_1_maps_to_0(self):
        assert _normalize_severity(1.0) == 0.0

    def test_severity_5_maps_to_100(self):
        assert _normalize_severity(5.0) == 100.0

    def test_severity_3_maps_to_50(self):
        assert _normalize_severity(3.0) == 50.0

    def test_business_impact_1_maps_to_0(self):
        assert _normalize_business_impact(1.0) == 0.0

    def test_business_impact_5_maps_to_100(self):
        assert _normalize_business_impact(5.0) == 100.0

    def test_trend_zero_pct_maps_to_33(self):
        """Stable (0% change) should map to ~33."""
        result = _normalize_trend(0.0)
        assert abs(result - 33.33) < 0.1

    def test_trend_minus_100_maps_to_0(self):
        """Completely declining (-100%) should map to 0."""
        result = _normalize_trend(-100.0)
        assert result == 0.0

    def test_trend_plus_200_maps_to_100(self):
        """Tripling (+200%) should map to 100."""
        result = _normalize_trend(200.0)
        assert result == 100.0

    def test_trend_clamped_above_200(self):
        """Values above 200% should be clamped."""
        result_200 = _normalize_trend(200.0)
        result_500 = _normalize_trend(500.0)
        assert result_200 == result_500 == 100.0

    def test_trend_clamped_below_minus_100(self):
        """Values below -100% should be clamped."""
        result_minus100 = _normalize_trend(-100.0)
        result_minus200 = _normalize_trend(-200.0)
        assert result_minus100 == result_minus200 == 0.0


class TestTrendComputation:
    """Test the trend computation with sample size guards."""

    def test_small_current_sample_returns_neutral(self):
        """If current sample < MIN_TREND_SAMPLE, return 50.0 (neutral)."""
        score, label = _compute_trend(current_count=2, prior_count=10)
        assert score == 50.0
        assert "insufficient" in label.lower()

    def test_small_prior_sample_returns_neutral(self):
        """If prior sample < MIN_TREND_SAMPLE, return 50.0."""
        score, label = _compute_trend(current_count=10, prior_count=2)
        assert score == 50.0
        assert "insufficient" in label.lower()

    def test_zero_prior_returns_neutral_due_to_small_sample(self):
        """Zero prior sample (< MIN_TREND_SAMPLE) returns 50.0 neutral score per small sample rule."""
        score, label = _compute_trend(current_count=10, prior_count=0)
        assert score == 50.0
        assert "insufficient" in label.lower()

    def test_rising_trend(self):
        score, label = _compute_trend(current_count=20, prior_count=10)
        # +100% change → (100+100)/3 = 66.7
        assert abs(score - 66.7) < 0.5
        assert "rising" in label.lower()

    def test_declining_trend(self):
        score, label = _compute_trend(current_count=5, prior_count=20)
        # -75% change → (-75+100)/3 = 8.3
        assert score < 33.0
        assert "declining" in label.lower()


class TestPriorityScoreFormula:
    """Test the composite priority score formula."""

    def test_weights_sum_to_1(self):
        total = (
            SCORE_WEIGHT_FREQUENCY
            + SCORE_WEIGHT_SEVERITY
            + SCORE_WEIGHT_BUSINESS_IMPACT
            + SCORE_WEIGHT_TREND
        )
        assert abs(total - 1.0) < 1e-10, f"Weights sum to {total}, not 1.0"

    def test_score_is_between_0_and_100(self, classified_reviews_sample):
        scores = compute_priority_scores(classified_reviews_sample)
        for s in scores:
            assert 0 <= s["priority_score"] <= 100, (
                f"Score out of range: {s['priority_score']} for {s['primary_category']}"
            )

    def test_higher_frequency_increases_score(self):
        """Manual test: higher frequency → higher priority (all else equal)."""
        from datetime import timedelta, timezone, datetime

        now = datetime.now(timezone.utc)
        # Low frequency: 2 reviews in category
        low_reviews = [
            {"game": "hitwicket", "primary_category": "Experience", "subcategory": "Bugs / crashes",
             "sentiment": "negative", "severity": 3, "business_impact": 3,
             "review_date": (now - timedelta(days=5)).isoformat(), "rating": 2}
            for _ in range(2)
        ] + [
            {"game": "hitwicket", "primary_category": "Gameplay", "subcategory": "Match / mechanics",
             "sentiment": "positive", "severity": 1, "business_impact": 1,
             "review_date": (now - timedelta(days=3)).isoformat(), "rating": 5}
            for _ in range(8)
        ]

        # High frequency: 8 reviews in category (same severity)
        high_reviews = [
            {"game": "hitwicket", "primary_category": "Experience", "subcategory": "Bugs / crashes",
             "sentiment": "negative", "severity": 3, "business_impact": 3,
             "review_date": (now - timedelta(days=5)).isoformat(), "rating": 2}
            for _ in range(8)
        ] + [
            {"game": "hitwicket", "primary_category": "Gameplay", "subcategory": "Match / mechanics",
             "sentiment": "positive", "severity": 1, "business_impact": 1,
             "review_date": (now - timedelta(days=3)).isoformat(), "rating": 5}
            for _ in range(2)
        ]

        low_scores = {s["primary_category"]: s for s in compute_priority_scores(low_reviews)}
        high_scores = {s["primary_category"]: s for s in compute_priority_scores(high_reviews)}

        low_exp = low_scores.get("Experience", {}).get("priority_score", 0)
        high_exp = high_scores.get("Experience", {}).get("priority_score", 0)
        assert high_exp > low_exp

    def test_empty_reviews_returns_empty(self):
        result = compute_priority_scores([])
        assert result == []

    def test_results_sorted_by_priority_descending(self, classified_reviews_sample):
        scores = compute_priority_scores(classified_reviews_sample)
        priorities = [s["priority_score"] for s in scores]
        assert priorities == sorted(priorities, reverse=True)

    def test_frequency_pct_sums_to_100_per_game(self, classified_reviews_sample):
        """The frequency percentages across all categories should sum to 100% per game."""
        scores = compute_priority_scores(classified_reviews_sample, game="hitwicket")
        total_pct = sum(s["frequency_pct"] for s in scores)
        # Note: subcategories can cause slight over-count, check primary only
        primary_scores = {}
        for s in scores:
            cat = s["primary_category"]
            primary_scores[cat] = primary_scores.get(cat, 0) + s["review_count"]

        total = sum(primary_scores.values())
        for cat, count in primary_scores.items():
            expected_pct = (count / total) * 100
            actual_scores = [s for s in scores if s["primary_category"] == cat]
            actual_pct = sum(s["frequency_pct"] for s in actual_scores)
            assert abs(actual_pct - expected_pct) < 0.1
