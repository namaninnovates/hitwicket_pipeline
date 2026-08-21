"""
Database setup and storage layer for the review intelligence pipeline.
Supports dual-engine:
- SQLite (local development, testing, offline mode)
- PostgreSQL / Neon (serverless cloud deployment on Vercel)
"""

import logging
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional, Union
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import DB_PATH, DATABASE_URL, IS_POSTGRES

logger = logging.getLogger(__name__)

# Attempt to import psycopg2 for Postgres support
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    psycopg2 = None
    RealDictCursor = None
    PSYCOPG2_AVAILABLE = False


def is_postgres_connection(conn: Any) -> bool:
    """Check if the provided connection is a PostgreSQL connection."""
    if not PSYCOPG2_AVAILABLE: return False
    return hasattr(conn, "cursor") and not isinstance(conn, sqlite3.Connection)


def get_connection(db_path: Optional[Union[Path, str]] = None) -> Any:
    """
    Return a database connection (PostgreSQL if configured, else local SQLite).
    """
    if IS_POSTGRES and PSYCOPG2_AVAILABLE and DATABASE_URL:
        try:
            conn = psycopg2.connect(DATABASE_URL)
            conn.autocommit = True
            initialize_db(conn)
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            # Fallback to sqlite
    
    target = Path(db_path) if db_path else DB_PATH
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    conn = sqlite3.connect(str(target), timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
    except Exception:
        pass

    # Ensure schema tables exist on every connection
    initialize_db(conn)
    return conn


def initialize_db(conn: Optional[Any] = None) -> None:
    """Create all tables if they don't exist. Safe to call on every run."""
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True

    try:
        if is_postgres_connection(conn):
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS reviews (
                        id           SERIAL PRIMARY KEY,
                        game         VARCHAR(100) NOT NULL,
                        source       VARCHAR(50) NOT NULL DEFAULT 'google_play',
                        review_id    VARCHAR(255) NOT NULL,
                        review_date  VARCHAR(100),
                        rating       INTEGER,
                        review_text  TEXT,
                        app_version  VARCHAR(100),
                        thumbs_up    INTEGER DEFAULT 0,
                        retrieved_at VARCHAR(100) NOT NULL,
                        UNIQUE(source, review_id)
                    );

                    CREATE INDEX IF NOT EXISTS idx_reviews_game
                        ON reviews(game);

                    CREATE INDEX IF NOT EXISTS idx_reviews_date
                        ON reviews(review_date);

                    CREATE TABLE IF NOT EXISTS classifications (
                        id                 SERIAL PRIMARY KEY,
                        review_db_id       INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
                        primary_category   VARCHAR(100),
                        subcategory        VARCHAR(100),
                        sentiment          VARCHAR(50),
                        severity           INTEGER,
                        business_impact    INTEGER,
                        issue              TEXT,
                        actionability      INTEGER,
                        confidence         DOUBLE PRECISION,
                        model_used         VARCHAR(100),
                        classified_at      VARCHAR(100) NOT NULL,
                        classification_raw TEXT,
                        UNIQUE(review_db_id)
                    );

                    CREATE INDEX IF NOT EXISTS idx_classifications_review
                        ON classifications(review_db_id);

                    CREATE TABLE IF NOT EXISTS pipeline_runs (
                        id                 SERIAL PRIMARY KEY,
                        run_at             VARCHAR(100) NOT NULL,
                        reviews_fetched    INTEGER DEFAULT 0,
                        within_90_days     INTEGER DEFAULT 0,
                        new_reviews        INTEGER DEFAULT 0,
                        classified         INTEGER DEFAULT 0,
                        classification_failures INTEGER DEFAULT 0,
                        model_used         VARCHAR(100),
                        output_dir         TEXT,
                        stages_run         TEXT,
                        notes              TEXT
                    );

                    CREATE TABLE IF NOT EXISTS history_snapshots (
                        id             VARCHAR(255) PRIMARY KEY,
                        title          VARCHAR(255),
                        timestamp      VARCHAR(100),
                        game           VARCHAR(100),
                        totalReviews   INTEGER,
                        avgRating      DOUBLE PRECISION,
                        positivePct    DOUBLE PRECISION,
                        topPriority    VARCHAR(255),
                        brief          TEXT,
                        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS briefs (
                        game           VARCHAR(100) PRIMARY KEY,
                        brief_text     TEXT,
                        generated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
            logger.info("Neon PostgreSQL schema initialized successfully.")
        else:
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
                        review_db_id       INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
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

                    CREATE TABLE IF NOT EXISTS history_snapshots (
                        id             TEXT PRIMARY KEY,
                        title          TEXT,
                        timestamp      TEXT,
                        game           TEXT,
                        totalReviews   INTEGER,
                        avgRating      REAL,
                        positivePct    REAL,
                        topPriority    TEXT,
                        brief          TEXT,
                        created_at     TEXT NOT NULL
                    );
                """)
            logger.info(f"SQLite database initialized at {DB_PATH}")
    finally:
        if should_close:
            conn.close()


def insert_review(
    conn: Any,
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
    Idempotent and conflict-safe on both SQLite and PostgreSQL.
    """
    retrieved_at = datetime.now(timezone.utc).isoformat()
    try:
        if is_postgres_connection(conn):
            with conn.cursor() as cur:
                # Dual-insert into master_reviews to keep master vault up-to-date
                try:
                    cur.execute(
                        """
                        INSERT INTO master_reviews
                            (game, source, review_id, review_date, rating, review_text,
                             app_version, thumbs_up, retrieved_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (source, review_id) DO NOTHING
                        """,
                        (game, source, review_id, review_date, rating, review_text,
                         app_version, thumbs_up, retrieved_at),
                    )
                except Exception:
                    pass

                cur.execute(
                    """
                    INSERT INTO reviews
                        (game, source, review_id, review_date, rating, review_text,
                         app_version, thumbs_up, retrieved_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (source, review_id) DO NOTHING
                    RETURNING id
                    """,
                    (game, source, review_id, review_date, rating, review_text,
                     app_version, thumbs_up, retrieved_at),
                )
                row = cur.fetchone()
                return row is not None
        else:
            with conn:
                try:
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO master_reviews
                            (game, source, review_id, review_date, rating, review_text,
                             app_version, thumbs_up, retrieved_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (game, source, review_id, review_date, rating, review_text,
                         app_version, thumbs_up, retrieved_at),
                    )
                except Exception:
                    pass

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
                conn.commit()
                return cursor.rowcount > 0
    except Exception as e:
        logger.error(f"DB insert error for review {review_id}: {e}")
        return False


def insert_classification(
    conn: Any,
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
    """Insert or update a classification result."""
    classified_at = datetime.now(timezone.utc).isoformat()
    try:
        if is_postgres_connection(conn):
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO classifications
                        (review_db_id, primary_category, subcategory, sentiment,
                         severity, business_impact, issue, actionability, confidence,
                         model_used, classified_at, classification_raw)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (review_db_id) DO UPDATE SET
                        primary_category = EXCLUDED.primary_category,
                        subcategory = EXCLUDED.subcategory,
                        sentiment = EXCLUDED.sentiment,
                        severity = EXCLUDED.severity,
                        business_impact = EXCLUDED.business_impact,
                        issue = EXCLUDED.issue,
                        actionability = EXCLUDED.actionability,
                        confidence = EXCLUDED.confidence,
                        model_used = EXCLUDED.model_used,
                        classified_at = EXCLUDED.classified_at,
                        classification_raw = EXCLUDED.classification_raw
                    """,
                    (review_db_id, primary_category, subcategory, sentiment,
                     severity, business_impact, issue, actionability, confidence,
                     model_used, classified_at, classification_raw),
                )
                return True
        else:
            with conn:
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
                conn.commit()
                return True
    except Exception as e:
        logger.error(f"DB classification insert error for review_db_id {review_db_id}: {e}")
        return False


def get_unclassified_reviews(
    conn: Any,
    game: Optional[str] = None,
    limit: int = 10000,
) -> list[dict]:
    """Fetch reviews that have not yet been classified."""
    if is_postgres_connection(conn):
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
            query += " AND r.game = %s"
            params.append(game)
        query += " ORDER BY r.review_date DESC LIMIT %s"
        params.append(limit)

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            return [dict(row) for row in rows]
    else:
        query = """
            SELECT r.id, r.game, r.review_id, r.review_date, r.rating, r.review_text, r.app_version
            FROM reviews r
            LEFT JOIN classifications c ON r.id = c.review_db_id
            WHERE c.id IS NULL
              AND r.review_text IS NOT NULL
              AND length(r.review_text) >= 10
        """
        params_sqlite: list[Any] = []
        if game:
            query += " AND r.game = ?"
            params_sqlite.append(game)
        query += " ORDER BY r.review_date DESC LIMIT ?"
        params_sqlite.append(limit)

        cursor = conn.execute(query, params_sqlite)
        return [dict(row) for row in cursor.fetchall()]


def get_classified_reviews(
    conn: Any,
    game: Optional[str] = None,
    days: int = 90,
) -> list[dict]:
    """Fetch classified reviews within the last N days."""
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    if is_postgres_connection(conn):
        query = """
            SELECT r.id, r.game, r.review_id, r.review_date, r.rating,
                   r.review_text, r.app_version,
                   c.primary_category, c.subcategory, c.sentiment,
                   c.severity, c.business_impact, c.issue,
                   c.actionability, c.confidence, c.model_used
            FROM reviews r
            JOIN classifications c ON r.id = c.review_db_id
            WHERE r.review_date >= %s
        """
        params: list[Any] = [cutoff_date]
        if game:
            query += " AND r.game = %s"
            params.append(game)
        query += " ORDER BY r.review_date DESC"

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            return [dict(row) for row in rows]
    else:
        query = """
            SELECT r.id, r.game, r.review_id, r.review_date, r.rating,
                   r.review_text, r.app_version,
                   c.primary_category, c.subcategory, c.sentiment,
                   c.severity, c.business_impact, c.issue,
                   c.actionability, c.confidence, c.model_used
            FROM reviews r
            JOIN classifications c ON r.id = c.review_db_id
            WHERE r.review_date >= ?
        """
        params_sqlite: list[Any] = [cutoff_date]
        if game:
            query += " AND r.game = ?"
            params_sqlite.append(game)
        query += " ORDER BY r.review_date DESC"

        cursor = conn.execute(query, params_sqlite)
        return [dict(row) for row in cursor.fetchall()]


def purge_game_reviews(conn: Any, game_key: str) -> None:
    """Purge all reviews and classifications for a given game (used in fresh runs)."""
    if is_postgres_connection(conn):
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM classifications WHERE review_db_id IN (SELECT id FROM reviews WHERE game = %s)",
                (game_key,)
            )
            cur.execute("DELETE FROM reviews WHERE game = %s", (game_key,))
    else:
        with conn:
            conn.execute(
                "DELETE FROM classifications WHERE review_db_id IN (SELECT id FROM reviews WHERE game = ?)",
                (game_key,)
            )
            conn.execute("DELETE FROM reviews WHERE game = ?", (game_key,))


def log_pipeline_run(conn: Any, **kwargs) -> int:
    """Record a pipeline execution. Returns the run ID."""
    run_at = datetime.now(timezone.utc).isoformat()
    args = (
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
    )

    if is_postgres_connection(conn):
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pipeline_runs
                    (run_at, reviews_fetched, within_90_days, new_reviews,
                     classified, classification_failures, model_used, output_dir, stages_run, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                args,
            )
            row = cur.fetchone()
            if not row:
                return 0
            return row[0] if isinstance(row, (tuple, list)) else row["id"]
    else:
        cursor = conn.execute(
            """
            INSERT INTO pipeline_runs
                (run_at, reviews_fetched, within_90_days, new_reviews,
                 classified, classification_failures, model_used, output_dir, stages_run, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            args,
        )
        return cursor.lastrowid

def insert_history_snapshot(conn: Any, snapshot: dict) -> bool:
    created_at = datetime.now(timezone.utc).isoformat()
    args = (
        snapshot.get("id"),
        snapshot.get("title"),
        snapshot.get("timestamp"),
        snapshot.get("game"),
        snapshot.get("totalReviews"),
        snapshot.get("avgRating"),
        snapshot.get("positivePct"),
        snapshot.get("topPriority"),
        snapshot.get("brief"),
        created_at
    )
    try:
        if is_postgres_connection(conn):
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO history_snapshots
                        (id, title, timestamp, game, totalReviews, avgRating, positivePct, topPriority, brief, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    args,
                )
                return True
        else:
            with conn:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO history_snapshots
                        (id, title, timestamp, game, totalReviews, avgRating, positivePct, topPriority, brief, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    args,
                )
                return True
    except Exception as e:
        logger.error(f"Failed to insert history snapshot: {e}")
        return False

def get_history_snapshots(conn: Any, limit: int = 50) -> list[dict]:
    query = "SELECT * FROM history_snapshots ORDER BY timestamp DESC LIMIT "
    try:
        if is_postgres_connection(conn):
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query + "%s", (limit,))
                rows = cur.fetchall()
                return [dict(row) for row in rows]
        else:
            cursor = conn.execute(query + "?", (limit,))
            return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Failed to fetch history snapshots: {e}")
        return []

def upsert_brief(conn: Any, game: str, brief_text: str) -> bool:
    try:
        if is_postgres_connection(conn):
            query = """
            INSERT INTO briefs (game, brief_text, generated_at)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (game) DO UPDATE 
            SET brief_text = EXCLUDED.brief_text, generated_at = CURRENT_TIMESTAMP
            """
            with conn.cursor() as cur:
                cur.execute(query, (game, brief_text))
            return True
        else:
            query = """
            INSERT INTO briefs (game, brief_text, generated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (game) DO UPDATE 
            SET brief_text = excluded.brief_text, generated_at = CURRENT_TIMESTAMP
            """
            with conn:
                conn.execute(query, (game, brief_text))
            return True
    except Exception as e:
        logger.error(f"Failed to upsert brief for {game}: {e}")
        return False

def get_brief_for_game(conn: Any, game: str) -> Optional[str]:
    try:
        games_to_check = [game]
        if game in ["all", "global"]:
            games_to_check = ["all", "global"]
        elif game in ["tennis", "tennis_clash"]:
            games_to_check = ["tennis_clash", "tennis"]
        elif game in ["baseball", "baseball_clash"]:
            games_to_check = ["baseball_clash", "baseball"]

        for g in games_to_check:
            if is_postgres_connection(conn):
                with conn.cursor() as cur:
                    cur.execute("SELECT brief_text FROM briefs WHERE game = %s", (g,))
                    row = cur.fetchone()
                    if row and row[0]:
                        return row[0]
            else:
                cursor = conn.execute("SELECT brief_text FROM briefs WHERE game = ?", (g,))
                row = cursor.fetchone()
                if row and row[0]:
                    return row[0]
        return None
    except Exception as e:
        logger.error(f"Failed to fetch brief for game {game}: {e}")
        return None


def get_latest_master_review_date(conn: Any, game_key: str) -> Optional[str]:
    """Retrieve the newest review_date in master_reviews for a specific game."""
    try:
        if is_postgres_connection(conn):
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT review_date FROM master_reviews WHERE game = %s ORDER BY review_date DESC LIMIT 1",
                    (game_key,)
                )
                row = cur.fetchone()
                return row[0] if row else None
        else:
            cursor = conn.execute(
                "SELECT review_date FROM master_reviews WHERE game = ? ORDER BY review_date DESC LIMIT 1",
                (game_key,)
            )
            row = cursor.fetchone()
            return row[0] if row else None
    except Exception as e:
        logger.error(f"Failed to fetch latest master review date for {game_key}: {e}")
        return None

def hydrate_from_master(conn: Any, game_key: str, window_days: int) -> int:
    """
    Copy matching historical reviews from master_reviews into active reviews table.
    Returns the number of reviews hydrated.
    """
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=window_days)).strftime("%Y-%m-%d")
    try:
        if is_postgres_connection(conn):
            query = """
            INSERT INTO reviews (game, source, review_id, review_date, rating, review_text, app_version, thumbs_up, retrieved_at)
            SELECT game, source, review_id, review_date, rating, review_text, app_version, thumbs_up, retrieved_at
            FROM master_reviews
            WHERE game = %s AND review_date >= %s
            ON CONFLICT (source, review_id) DO NOTHING
            """
            with conn.cursor() as cur:
                cur.execute(query, (game_key, cutoff_date))
                return cur.rowcount if cur.rowcount > 0 else 0
        else:
            query = """
            INSERT OR IGNORE INTO reviews (game, source, review_id, review_date, rating, review_text, app_version, thumbs_up, retrieved_at)
            SELECT game, source, review_id, review_date, rating, review_text, app_version, thumbs_up, retrieved_at
            FROM master_reviews
            WHERE game = ? AND review_date >= ?
            """
            with conn:
                cursor = conn.execute(query, (game_key, cutoff_date))
                return cursor.rowcount if cursor.rowcount > 0 else 0
    except Exception as e:
        logger.error(f"Failed to hydrate reviews from master for {game_key}: {e}")
        return 0

def get_latest_brief_for_game(conn: Any, game: str) -> Optional[str]:
    try:
        query = "SELECT brief FROM history_snapshots WHERE game = "
        if is_postgres_connection(conn):
            with conn.cursor() as cur:
                cur.execute(query + "%s ORDER BY timestamp DESC LIMIT 1", (game,))
                row = cur.fetchone()
                return row[0] if row else None
        else:
            cursor = conn.execute(query + "? ORDER BY timestamp DESC LIMIT 1", (game,))
            row = cursor.fetchone()
            return row[0] if row else None
    except Exception as e:
        logger.error(f"Failed to fetch latest brief for game {game}: {e}")
        return None

def delete_history_snapshot(conn: Any, snapshot_id: str) -> bool:
    try:
        if is_postgres_connection(conn):
            with conn.cursor() as cur:
                cur.execute("DELETE FROM history_snapshots WHERE id = %s", (snapshot_id,))
                return True
        else:
            with conn:
                conn.execute("DELETE FROM history_snapshots WHERE id = ?", (snapshot_id,))
                return True
    except Exception as e:
        logger.error(f"Failed to delete history snapshot: {e}")
        return False
