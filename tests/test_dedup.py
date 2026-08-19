"""
Tests for duplicate review handling.
Verifies that INSERT OR IGNORE prevents duplicate records on re-runs.
"""

import pytest
from datetime import datetime, timezone
from src.ingestion.storage import insert_review


class TestDuplicateHandling:
    """Verify idempotent ingestion via INSERT OR IGNORE."""

    def test_insert_new_review_returns_true(self, in_memory_db):
        """First insert should succeed and return True."""
        result = insert_review(
            in_memory_db,
            game="hitwicket",
            review_id="unique-review-001",
            review_date="2026-08-01T10:00:00",
            rating=4,
            review_text="Great cricket strategy game!",
            app_version="7.0.1",
        )
        assert result is True

    def test_duplicate_review_returns_false(self, in_memory_db):
        """Second insert with same review_id should be ignored, return False."""
        kwargs = dict(
            game="hitwicket",
            review_id="unique-review-dup",
            review_date="2026-08-01T10:00:00",
            rating=5,
            review_text="Best game ever!",
            app_version="7.0.1",
        )
        first = insert_review(in_memory_db, **kwargs)
        second = insert_review(in_memory_db, **kwargs)
        assert first is True
        assert second is False

    def test_duplicate_does_not_increment_count(self, in_memory_db):
        """Repeated inserts should not create multiple rows."""
        review_id = "count-test-review"
        for _ in range(5):
            insert_review(
                in_memory_db,
                game="hitwicket",
                review_id=review_id,
                review_date="2026-08-10T09:00:00",
                rating=3,
                review_text="Decent game, average experience.",
                app_version=None,
            )

        cursor = in_memory_db.execute(
            "SELECT COUNT(*) FROM reviews WHERE review_id = ?", (review_id,)
        )
        count = cursor.fetchone()[0]
        assert count == 1, f"Expected 1 row, got {count}"

    def test_different_games_same_review_id_allowed(self, in_memory_db):
        """
        Two reviews with the same review_id but different sources are distinct.
        UNIQUE constraint is on (source, review_id) — not just review_id.
        """
        insert_review(
            in_memory_db,
            game="hitwicket",
            review_id="shared-id-001",
            review_date="2026-08-01T10:00:00",
            rating=4,
            review_text="Cricket game review",
            app_version=None,
            source="google_play",
        )
        insert_review(
            in_memory_db,
            game="tennis_clash",
            review_id="shared-id-001",
            review_date="2026-08-01T10:00:00",
            rating=3,
            review_text="Tennis game review",
            app_version=None,
            source="apple_store",  # Different source
        )

        cursor = in_memory_db.execute(
            "SELECT COUNT(*) FROM reviews WHERE review_id = 'shared-id-001'"
        )
        count = cursor.fetchone()[0]
        assert count == 2

    def test_multiple_games_no_cross_contamination(self, in_memory_db):
        """Reviews for different games should be stored separately."""
        for game in ["hitwicket", "tennis_clash", "baseball_clash"]:
            insert_review(
                in_memory_db,
                game=game,
                review_id=f"review-for-{game}",
                review_date="2026-08-15T12:00:00",
                rating=4,
                review_text=f"Review for {game}",
                app_version=None,
            )

        cursor = in_memory_db.execute("SELECT COUNT(*) FROM reviews")
        assert cursor.fetchone()[0] == 3

        for game in ["hitwicket", "tennis_clash", "baseball_clash"]:
            cursor = in_memory_db.execute(
                "SELECT game FROM reviews WHERE review_id = ?", (f"review-for-{game}",)
            )
            row = cursor.fetchone()
            assert row["game"] == game
