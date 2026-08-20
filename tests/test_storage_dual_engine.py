"""
Unit tests for the dual-engine storage layer (SQLite and PostgreSQL/Neon compatibility).
"""

import sqlite3
import pytest
from datetime import datetime, timezone, timedelta
from src.ingestion.storage import (
    initialize_db,
    insert_review,
    insert_classification,
    get_unclassified_reviews,
    get_classified_reviews,
    purge_game_reviews,
    log_pipeline_run,
    is_postgres_connection,
)


def test_sqlite_initialize_and_crud(in_memory_db):
    """Test standard CRUD operations on SQLite."""
    initialize_db(in_memory_db)

    # 1. Insert review
    now_str = datetime.now(timezone.utc).isoformat()
    inserted = insert_review(
        in_memory_db,
        game="hitwicket",
        review_id="rev-001",
        review_date=now_str,
        rating=5,
        review_text="Super fun cricket game with amazing graphics and tactics!",
        app_version="7.2.0",
        thumbs_up=3,
        source="google_play",
    )
    assert inserted is True

    # 2. Duplicate insert should return False (idempotent)
    dup = insert_review(
        in_memory_db,
        game="hitwicket",
        review_id="rev-001",
        review_date=now_str,
        rating=5,
        review_text="Duplicate review",
        app_version="7.2.0",
    )
    assert dup is False

    # 3. Get unclassified
    unclass = get_unclassified_reviews(in_memory_db, game="hitwicket")
    assert len(unclass) == 1
    assert unclass[0]["review_id"] == "rev-001"
    rev_id = unclass[0]["id"]

    # 4. Insert classification
    class_ok = insert_classification(
        in_memory_db,
        review_db_id=rev_id,
        primary_category="Gameplay",
        subcategory="Match / mechanics",
        sentiment="positive",
        severity=1,
        business_impact=1,
        issue="Praise for tactics",
        actionability=2,
        confidence=0.95,
        model_used="rule_based_nlp",
    )
    assert class_ok is True

    # 5. Get classified reviews
    classified = get_classified_reviews(in_memory_db, game="hitwicket", days=90)
    assert len(classified) == 1
    assert classified[0]["primary_category"] == "Gameplay"
    assert classified[0]["sentiment"] == "positive"

    # 6. Log pipeline run
    run_id = log_pipeline_run(
        in_memory_db,
        reviews_fetched=10,
        within_90_days=10,
        new_reviews=1,
        classified=1,
        model_used="rule_based_nlp",
        notes="Test run",
    )
    assert run_id > 0

    # 7. Purge game reviews
    purge_game_reviews(in_memory_db, "hitwicket")
    remaining = get_classified_reviews(in_memory_db, game="hitwicket", days=90)
    assert len(remaining) == 0


def test_is_postgres_connection_detection():
    """Verify is_postgres_connection accurately identifies connection types."""
    sqlite_conn = sqlite3.connect(":memory:")
    assert is_postgres_connection(sqlite_conn) is False
    assert is_postgres_connection(None) is False
