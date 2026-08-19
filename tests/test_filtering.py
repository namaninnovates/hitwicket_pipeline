"""
Tests for 90-day date filtering logic in the cleaning module.
"""

import pytest
from datetime import datetime, timedelta, timezone
from src.cleaning.cleaner import is_within_window, clean_review, clean_batch


class TestDateFiltering:
    """Verify that only reviews within the 90-day window are kept."""

    def test_review_today_is_within_window(self):
        now = datetime.now(timezone.utc).isoformat()
        assert is_within_window(now) is True

    def test_review_89_days_ago_is_within_window(self):
        dt = (datetime.now(timezone.utc) - timedelta(days=89)).isoformat()
        assert is_within_window(dt) is True

    def test_review_exactly_90_days_ago_is_within_window(self):
        # 90 days ago is the boundary — should be included
        dt = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
        assert is_within_window(dt) is True

    def test_review_91_days_ago_is_outside_window(self):
        dt = (datetime.now(timezone.utc) - timedelta(days=91)).isoformat()
        assert is_within_window(dt) is False

    def test_review_1_year_ago_is_outside_window(self):
        dt = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
        assert is_within_window(dt) is False

    def test_none_date_is_outside_window(self):
        assert is_within_window(None) is False

    def test_empty_date_is_outside_window(self):
        assert is_within_window("") is False

    def test_malformed_date_is_outside_window(self):
        assert is_within_window("not-a-date") is False

    def test_clean_review_rejects_old_review(self):
        old_date = (datetime.now(timezone.utc) - timedelta(days=95)).isoformat()
        raw = {
            "game": "hitwicket",
            "source": "google_play",
            "review_id": "old-review",
            "review_date": old_date,
            "rating": 3,
            "review_text": "This review is old and should be filtered out",
            "app_version": None,
            "thumbs_up": 0,
        }
        result = clean_review(raw)
        assert result is None

    def test_clean_review_keeps_recent_review(self):
        recent_date = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        raw = {
            "game": "hitwicket",
            "source": "google_play",
            "review_id": "recent-review",
            "review_date": recent_date,
            "rating": 4,
            "review_text": "This is a recent review that should be kept",
            "app_version": "7.0.1",
            "thumbs_up": 2,
        }
        result = clean_review(raw)
        assert result is not None
        assert result["review_id"] == "recent-review"

    def test_clean_batch_filters_mixed(self, sample_reviews_mixed):
        result = clean_batch(sample_reviews_mixed)
        # Only inside-1 and inside-2 are within 90 days
        kept_ids = [r["review_id"] for r in result["cleaned"]]
        assert "inside-1" in kept_ids
        assert "inside-2" in kept_ids
        assert "outside-1" not in kept_ids
        assert "outside-2" not in kept_ids

    def test_clean_batch_counts_are_correct(self, sample_reviews_mixed):
        result = clean_batch(sample_reviews_mixed)
        assert result["total"] == 4
        assert len(result["cleaned"]) == 2
        assert result["skipped_date"] == 2

    def test_custom_window_days(self):
        """Test that a 30-day window rejects reviews between 31–90 days."""
        dt_45_days = (datetime.now(timezone.utc) - timedelta(days=45)).isoformat()
        # Within 90 days but outside 30 days
        assert is_within_window(dt_45_days, window_days=90) is True
        assert is_within_window(dt_45_days, window_days=30) is False
