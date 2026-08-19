"""
pytest configuration and shared fixtures for the test suite.
"""

import pytest
import sqlite3
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture
def sample_reviews_90d():
    """A set of reviews, all within the 90-day window."""
    now = datetime.now(timezone.utc)
    return [
        {
            "game": "hitwicket",
            "source": "google_play",
            "review_id": f"review-{i}",
            "review_date": (now - timedelta(days=i * 3)).isoformat(),
            "rating": (i % 5) + 1,
            "review_text": f"This is test review number {i}. " * 3,
            "app_version": "7.0.1",
            "thumbs_up": i,
            "is_substantive": True,
        }
        for i in range(20)
    ]


@pytest.fixture
def sample_reviews_mixed():
    """Reviews some inside, some outside the 90-day window."""
    now = datetime.now(timezone.utc)
    return [
        {
            "game": "hitwicket",
            "source": "google_play",
            "review_id": "inside-1",
            "review_date": (now - timedelta(days=10)).isoformat(),
            "rating": 3,
            "review_text": "Decent game but grindy",
            "app_version": None,
            "thumbs_up": 0,
        },
        {
            "game": "hitwicket",
            "source": "google_play",
            "review_id": "outside-1",
            "review_date": (now - timedelta(days=100)).isoformat(),
            "rating": 1,
            "review_text": "Old review outside window",
            "app_version": None,
            "thumbs_up": 0,
        },
        {
            "game": "hitwicket",
            "source": "google_play",
            "review_id": "outside-2",
            "review_date": (now - timedelta(days=95)).isoformat(),
            "rating": 4,
            "review_text": "Another old review",
            "app_version": None,
            "thumbs_up": 0,
        },
        {
            "game": "hitwicket",
            "source": "google_play",
            "review_id": "inside-2",
            "review_date": (now - timedelta(days=45)).isoformat(),
            "rating": 2,
            "review_text": "Pay to win is real here",
            "app_version": "7.0.0",
            "thumbs_up": 5,
        },
    ]


@pytest.fixture
def in_memory_db():
    """Provide an in-memory SQLite DB with the full schema."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS reviews (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            game         TEXT NOT NULL,
            source       TEXT NOT NULL DEFAULT 'google_play',
            review_id    TEXT NOT NULL,
            review_date  TEXT,
            rating       INTEGER,
            review_text  TEXT,
            app_version  TEXT,
            thumbs_up    INTEGER DEFAULT 0,
            retrieved_at TEXT NOT NULL,
            UNIQUE(source, review_id)
        );

        CREATE TABLE IF NOT EXISTS classifications (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            review_db_id       INTEGER NOT NULL REFERENCES reviews(id),
            primary_category   TEXT,
            subcategory        TEXT,
            sentiment          TEXT,
            severity           INTEGER,
            business_impact    INTEGER,
            issue              TEXT,
            actionability      INTEGER,
            confidence         REAL,
            model_used         TEXT,
            classified_at      TEXT NOT NULL,
            classification_raw TEXT,
            UNIQUE(review_db_id)
        );
    """)
    yield conn
    conn.close()


@pytest.fixture
def classified_reviews_sample():
    """Pre-classified reviews for scoring tests."""
    now = datetime.now(timezone.utc)
    base = [
        # Monetization - high frequency, high severity
        {"game": "hitwicket", "primary_category": "Monetization", "subcategory": "Pay-to-win pressure",
         "sentiment": "negative", "severity": 5, "business_impact": 5, "review_date": (now - timedelta(days=5)).isoformat(),
         "rating": 1},
        {"game": "hitwicket", "primary_category": "Monetization", "subcategory": "Pay-to-win pressure",
         "sentiment": "negative", "severity": 4, "business_impact": 4, "review_date": (now - timedelta(days=8)).isoformat(),
         "rating": 2},
        {"game": "hitwicket", "primary_category": "Monetization", "subcategory": "Ads",
         "sentiment": "negative", "severity": 3, "business_impact": 3, "review_date": (now - timedelta(days=12)).isoformat(),
         "rating": 2},
        # Gameplay - medium frequency, lower severity
        {"game": "hitwicket", "primary_category": "Gameplay", "subcategory": "Match / mechanics",
         "sentiment": "positive", "severity": 1, "business_impact": 1, "review_date": (now - timedelta(days=3)).isoformat(),
         "rating": 5},
        {"game": "hitwicket", "primary_category": "Gameplay", "subcategory": "Balance / fairness",
         "sentiment": "negative", "severity": 3, "business_impact": 3, "review_date": (now - timedelta(days=7)).isoformat(),
         "rating": 2},
    ]
    return base
