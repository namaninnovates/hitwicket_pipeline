"""
Database setup and storage layer for the review intelligence pipeline.
Uses SQLite with INSERT OR IGNORE for idempotent re-runs.
"""

import sqlite3
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import DB_PATH

logger = logging.getLogger(__name__)


def get_connection() -> sqlite3.Connection:
    """Return a connection with row_factory set for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def initialize_db() -> None:
    """Create all tables if they don't exist. Safe to call on every run."""
    conn = get_connection()
    with conn:
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

            CREATE INDEX IF NOT EXISTS idx_reviews_game
                ON reviews(game);

            CREATE INDEX IF NOT EXISTS idx_reviews_date
                ON reviews(review_date);

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

            CREATE INDEX IF NOT EXISTS idx_classifications_review
                ON classifications(review_db_id);

            CREATE TABLE IF NOT EXISTS pipeline_runs (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                run_at             TEXT NOT NULL,
                reviews_fetched    INTEGER DEFAULT 0,
                within_90_days     INTEGER DEFAULT 0,
                new_reviews        INTEGER DEFAULT 0,
                classified         INTEGER DEFAULT 0,
                classification_failures INTEGER DEFAULT 0,
                model_used         TEXT,
                output_dir         TEXT,
                stages_run         TEXT,
                notes              TEXT
            );
        """)
    conn.close()
    logger.info(f"Database initialized at {DB_PATH}")


def insert_review(
    conn: sqlite3.Connection,
    game: str,
    review_id: str,
    review_date: Optional[str],
    rating: Optional[int],
    review_text: Optional[str],
    app_version: Optional[str],
    thumbs_up: int = 0,
    source: str = "google_play",
) -> bool:
    """
    Insert a review. Returns True if inserted (new), False if skipped (duplicate).
    Uses INSERT OR IGNORE — safe to call on every run.
    """
    retrieved_at = datetime.utcnow().isoformat()
    try:
        cursor = conn.execute(
            """
            INSERT OR IGNORE INTO reviews
                (game, source, review_id, review_date, rating, review_text,
                 app_version, thumbs_up, retrieved_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (game, source, review_id, review_date, rating, review_text,
             app_version, thumbs_up, retrieved_at),
        )
        return cursor.rowcount > 0
    except sqlite3.Error as e:
        logger.error(f"DB insert error for review {review_id}: {e}")
        return False


def insert_classification(
    conn: sqlite3.Connection,
    review_db_id: int,
    primary_category: Optional[str],
    subcategory: Optional[str],
    sentiment: Optional[str],
    severity: Optional[int],
    business_impact: Optional[int],
    issue: Optional[str],
    actionability: Optional[int],
    confidence: Optional[float],
    model_used: str,
    classification_raw: Optional[str] = None,
) -> bool:
    """Insert or replace a classification result."""
    classified_at = datetime.utcnow().isoformat()
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO classifications
                (review_db_id, primary_category, subcategory, sentiment,
                 severity, business_impact, issue, actionability, confidence,
                 model_used, classified_at, classification_raw)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (review_db_id, primary_category, subcategory, sentiment,
             severity, business_impact, issue, actionability, confidence,
             model_used, classified_at, classification_raw),
        )
        return True
    except sqlite3.Error as e:
        logger.error(f"DB classification insert error for review_db_id {review_db_id}: {e}")
        return False


def get_unclassified_reviews(
    conn: sqlite3.Connection,
    game: Optional[str] = None,
    limit: int = 10000,
) -> list[dict]:
    """Fetch reviews that have not yet been classified."""
    query = """
        SELECT r.id, r.game, r.review_id, r.review_date, r.rating, r.review_text, r.app_version
        FROM reviews r
        LEFT JOIN classifications c ON r.id = c.review_db_id
        WHERE c.id IS NULL
          AND r.review_text IS NOT NULL
          AND length(r.review_text) >= 10
    """
    params: list[Any] = []
    if game:
        query += " AND r.game = ?"
        params.append(game)
    query += " ORDER BY r.review_date DESC LIMIT ?"
    params.append(limit)

    cursor = conn.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def get_classified_reviews(
    conn: sqlite3.Connection,
    game: Optional[str] = None,
    days: int = 90,
) -> list[dict]:
    """Fetch classified reviews within the last N days."""
    query = """
        SELECT r.id, r.game, r.review_id, r.review_date, r.rating,
               r.review_text, r.app_version,
               c.primary_category, c.subcategory, c.sentiment,
               c.severity, c.business_impact, c.issue,
               c.actionability, c.confidence, c.model_used
        FROM reviews r
        JOIN classifications c ON r.id = c.review_db_id
        WHERE date(r.review_date) >= date('now', ?)
    """
    params: list[Any] = [f"-{days} days"]
    if game:
        query += " AND r.game = ?"
        params.append(game)
    query += " ORDER BY r.review_date DESC"

    cursor = conn.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def log_pipeline_run(conn: sqlite3.Connection, **kwargs) -> int:
    """Record a pipeline execution. Returns the run ID."""
    run_at = datetime.utcnow().isoformat()
    cursor = conn.execute(
        """
        INSERT INTO pipeline_runs
            (run_at, reviews_fetched, within_90_days, new_reviews,
             classified, classification_failures, model_used, output_dir, stages_run, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            run_at,
            kwargs.get("reviews_fetched", 0),
            kwargs.get("within_90_days", 0),
            kwargs.get("new_reviews", 0),
            kwargs.get("classified", 0),
            kwargs.get("classification_failures", 0),
            kwargs.get("model_used", "N/A"),
            kwargs.get("output_dir", ""),
            kwargs.get("stages_run", ""),
            kwargs.get("notes", ""),
        ),
    )
    return cursor.lastrowid
