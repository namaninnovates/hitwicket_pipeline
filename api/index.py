import json
import os
import re
import sqlite3
import subprocess
import sys
import threading
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

app = FastAPI(title="Hitwicket Review Intelligence API", version="1.0.0")
handler = app
application = app

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(PROJECT_ROOT))

try:
    from src.config import GAMES, DB_PATH, OUTPUTS_DIR, CATEGORIES, DATABASE_URL, IS_POSTGRES
    from src.scoring.priority import compute_priority_scores
    from src.analysis.competitor import build_competitor_matrix, identify_hitwicket_specific_issues
    from src.ingestion.storage import get_connection as get_db_connection, is_postgres_connection, initialize_db
except ImportError as e:
    print(f"Warning: Could not import src modules: {e}")
    GAMES = {}
    DB_PATH = Path("data/reviews.db")
    OUTPUTS_DIR = Path("outputs")
    CATEGORIES = []
    DATABASE_URL = None
    IS_POSTGRES = False
    get_db_connection = None
    is_postgres_connection = lambda c: False
    initialize_db = lambda: None

# ─────────────────────────────────────────────
# Security Middleware & Headers
# ─────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add defensive HTTP response headers."""
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Concurrency lock to prevent multiple pipeline stampedes
pipeline_lock = threading.Lock()
active_process: Optional[subprocess.Popen] = None
active_process_lock = threading.Lock()

ALLOWED_DOCS = {
    "scoring": "SCORING.md",
    "taxonomy": "TAXONOMY.md",
    "readme": "README.md",
    "sources": "SOURCE_RESEARCH.md",
    "worklog": "AI_WORKLOG.md",
}

VALID_STAGES = {"all", "ingest", "clean", "classify", "score", "brief"}

# ─────────────────────────────────────────────
# Global Exception Handler (Prevents Traceback Leaks)
# ─────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."}
    )

# ─────────────────────────────────────────────
# Pydantic Request Models
# ─────────────────────────────────────────────
class ApiKeyPayload(BaseModel):
    api_key: str = Field(..., min_length=10, max_length=256)

    @field_validator("api_key")
    @classmethod
    def validate_key(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[A-Za-z0-9_\-\.]{10,256}$", v):
            raise ValueError("Invalid API key format. Alphanumeric, dots, dashes, and underscores only.")
        return v

class ResetDbPayload(BaseModel):
    confirm: str = Field(..., description="Must equal 'RESET' to confirm deletion")

# ─────────────────────────────────────────────
# Database Helpers
# ─────────────────────────────────────────────
def get_connection():
    if get_db_connection:
        try:
            return get_db_connection()
        except Exception as e:
            logger.error(f"Failed to connect to Neon PostgreSQL: {e}")
            return None
    return None

def load_data_df():
    conn = get_connection()
    df = pd.DataFrame()
    runs_df = pd.DataFrame()
    if conn:
        query = """
        SELECT 
            r.id, r.game, r.source, r.review_id, r.review_date, r.rating, 
            r.review_text, r.app_version, r.thumbs_up, r.retrieved_at,
            c.primary_category, c.subcategory, c.sentiment, c.severity, 
            c.business_impact, c.issue, c.actionability, c.confidence, c.model_used
        FROM reviews r
        LEFT JOIN classifications c ON r.id = c.review_db_id
        WHERE r.review_date IS NOT NULL
        ORDER BY r.review_date DESC
        """
        try:
            df = pd.read_sql_query(query, conn)
            runs_df = pd.read_sql_query("SELECT * FROM pipeline_runs ORDER BY id DESC LIMIT 10", conn)
        except Exception:
            df = pd.DataFrame()
            runs_df = pd.DataFrame()
        finally:
            try:
                conn.close()
            except Exception:
                pass

    # If database is empty on serverless cold-start before first run, fallback to bundled authentic reviews
    if df.empty:
        for csv_path in [
            PROJECT_ROOT / "data" / "scraped_reviews_export.csv",
            Path("data/scraped_reviews_export.csv"),
            Path("/var/task/data/scraped_reviews_export.csv")
        ]:
            if csv_path.exists():
                try:
                    df = pd.read_csv(csv_path)
                    break
                except Exception:
                    pass
    
    return df, runs_df

# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────
@app.get("/api/seed")
def get_seed_data():
    """Returns baseline review and classification records to initialize client-side local database."""
    df, _ = load_data_df()
    if df.empty:
        csv_fallback = PROJECT_ROOT / "data" / "scraped_reviews_export.csv"
        if csv_fallback.exists():
            try:
                df = pd.read_csv(csv_fallback)
            except Exception:
                df = pd.DataFrame()

    records = df.to_dict(orient="records") if not df.empty else []
    # Convert any NaN values to None for clean JSON serialization
    cleaned_records = []
    for r in records:
        cleaned_records.append({k: (None if pd.isna(v) else v) for k, v in r.items()})

    return {
        "status": "success",
        "total": len(cleaned_records),
        "reviews": cleaned_records
    }

@app.post("/api/database/reset")
def reset_database(payload: ResetDbPayload):
    if payload.confirm != "RESET":
        raise HTTPException(
            status_code=400,
            detail="Database reset requires explicit confirmation: {'confirm': 'RESET'}"
        )
    conn = get_connection()
    if not conn:
        raise HTTPException(
            status_code=500,
            detail="Local database connection failed."
        )
    try:
        if initialize_db:
            try:
                initialize_db(conn)
            except Exception:
                pass

        with conn:
            conn.execute("DELETE FROM classifications")
            conn.execute("DELETE FROM reviews")
            conn.execute("DELETE FROM pipeline_runs")
        
        try:
            conn.execute("VACUUM")
        except Exception:
            pass

        # Safely attempt to purge generated briefs from outputs directory if writable
        try:
            outputs_resolved = OUTPUTS_DIR.resolve()
            if outputs_resolved.exists():
                for f in outputs_resolved.glob("**/founder_brief_*.md"):
                    try:
                        f.unlink(missing_ok=True)
                    except Exception:
                        pass
        except Exception:
            pass

        return {"status": "success", "message": "Local database and telemetry reset successfully"}
    except Exception as e:
        logger.error(f"Failed to reset local database: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset local database: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

@app.get("/api/config/key")
def get_key_status():
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
    masked = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else ("Configured" if key else "")
    return {"has_key": bool(key), "masked_key": masked}

@app.post("/api/config/key")
def set_api_key(payload: ApiKeyPayload):
    key = payload.api_key
    os.environ["GEMINI_API_KEY"] = key
    env_file = PROJECT_ROOT / ".env"
    
    # Read or update .env file securely
    lines = []
    if env_file.exists():
        try:
            lines = [l for l in env_file.read_text(encoding="utf-8").splitlines() if not l.startswith("GEMINI_API_KEY=")]
        except Exception:
            lines = []
    lines.append(f"GEMINI_API_KEY={key}")
    env_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    
    return {"status": "success", "message": "Gemini API key saved successfully"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/games")
def get_games():
    return {"games": GAMES}

@app.get("/api/metrics")
def get_metrics():
    df, _ = load_data_df()
    if df.empty:
        return {"status": "empty"}
    
    df["review_datetime"] = pd.to_datetime(df["review_date"])
    
    metrics = {"overall": {}, "games": {}}
    
    def calc_metrics(subset):
        if subset.empty:
            return {"ingested": 0, "avgRating": 0, "negPct": 0, "posPct": 0, "classified": 0}
        return {
            "ingested": len(subset),
            "avgRating": round(subset["rating"].mean(), 2),
            "negPct": round((subset["rating"] <= 2).mean() * 100, 1),
            "posPct": round((subset["rating"] >= 4).mean() * 100, 1),
            "classified": int(subset["primary_category"].notna().sum())
        }
    
    metrics["overall"] = calc_metrics(df)
    
    # Calculate per-game metrics
    game_ratings = []
    for game_key in GAMES.keys():
        g_metrics = calc_metrics(df[df["game"] == game_key])
        metrics["games"][game_key] = g_metrics
        game_ratings.append({"game": game_key, "rating": g_metrics["avgRating"], "negPct": g_metrics["negPct"], "posPct": g_metrics["posPct"]})
        
    # Sort for rankings
    game_ratings.sort(key=lambda x: x["rating"], reverse=True)
    rank_map = {item["game"]: i + 1 for i, item in enumerate(game_ratings)}
    
    # Compute competitor averages (excluding Hitwicket)
    comp_df = df[df["game"] != "hitwicket"]
    comp_metrics = calc_metrics(comp_df)
    hw_metrics = metrics["games"].get("hitwicket", {})
    
    metrics["relative"] = {
        "competitor_avg_rating": comp_metrics["avgRating"],
        "competitor_neg_pct": comp_metrics["negPct"],
        "competitor_pos_pct": comp_metrics["posPct"],
        "hw_rating_delta": round(hw_metrics.get("avgRating", 0) - comp_metrics["avgRating"], 2),
        "hw_neg_delta": round(hw_metrics.get("negPct", 0) - comp_metrics["negPct"], 1),
        "hw_pos_delta": round(hw_metrics.get("posPct", 0) - comp_metrics["posPct"], 1),
        "rank_map": rank_map,
        "leaderboard": game_ratings
    }
    
    for game_key, g_data in metrics["games"].items():
        g_data["rank"] = rank_map.get(game_key, 1)
        g_data["vs_market_rating"] = round(g_data["avgRating"] - metrics["overall"]["avgRating"], 2)
        g_data["vs_market_neg"] = round(g_data["negPct"] - metrics["overall"]["negPct"], 1)
        g_data["vs_market_pos"] = round(g_data["posPct"] - metrics["overall"]["posPct"], 1)
        
    return metrics

@app.get("/api/priorities")
def get_priorities(game: str = "hitwicket"):
    sanitized_game = game.strip().lower()
    if sanitized_game != "all" and sanitized_game not in GAMES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid game parameter '{game}'. Allowed: {list(GAMES.keys())} or 'all'"
        )

    df, _ = load_data_df()
    if df.empty:
        return {"priorities": []}
    
    classified_records = df[df["primary_category"].notna()].to_dict("records")
    if not classified_records:
        return {"priorities": []}
        
    game_target = None if sanitized_game == "all" else sanitized_game
    priorities = compute_priority_scores(classified_records, game=game_target)
    
    # attach sample reviews
    for p in priorities:
        cat = p["primary_category"]
        subcat = p["subcategory"]
        item_game = p.get("game") or sanitized_game
        
        sample_revs = df[
            (df["primary_category"] == cat) & 
            (df["subcategory"] == subcat) & 
            (df["game"] == item_game) &
            (df["review_text"].notna())
        ].head(3)
        
        samples = []
        for _, r in sample_revs.iterrows():
            samples.append({
                "rating": r["rating"],
                "text": r["review_text"],
                "date": str(r["review_date"])[:10]
            })
        p["samples"] = samples
        
    return {"priorities": priorities}

@app.get("/api/matrix")
def get_matrix():
    df, _ = load_data_df()
    if df.empty:
        return {"matrix": {}, "insights": []}
        
    classified_records = df[df["primary_category"].notna()].to_dict("records")
    if not classified_records:
         return {"matrix": {}, "insights": []}
         
    matrix_data = build_competitor_matrix(classified_records)
    hitwicket_priorities = compute_priority_scores(classified_records, game="hitwicket")
    insights = identify_hitwicket_specific_issues(matrix_data, hitwicket_priorities)
    
    return {
        "matrix": matrix_data["matrix"],
        "insights": insights
    }

@app.get("/api/analytics")
def get_analytics():
    df, _ = load_data_df()
    if df.empty:
        return {"data": []}
        
    results = []
    for game_key in GAMES.keys():
        subset = df[df["game"] == game_key]
        if subset.empty:
            continue
            
        vol = len(subset)
        avg_rating = subset["rating"].mean()
        pos_pct = (subset["rating"] >= 4).mean() * 100
        neg_pct = (subset["rating"] <= 2).mean() * 100
        
        # sentiment
        sent_subset = subset.dropna(subset=["sentiment"])
        sent_counts = sent_subset["sentiment"].value_counts(normalize=True) * 100 if not sent_subset.empty else {}
        
        results.append({
            "game": game_key,
            "name": GAMES[game_key]["name"],
            "volume": vol,
            "avgRating": round(avg_rating, 2),
            "posPct": round(pos_pct, 1),
            "negPct": round(neg_pct, 1),
            "sentiment": {
                "positive": round(sent_counts.get("positive", 0), 1),
                "negative": round(sent_counts.get("negative", 0), 1),
                "mixed": round(sent_counts.get("mixed", 0), 1),
                "neutral": round(sent_counts.get("neutral", 0), 1),
            }
        })
    return {"analytics": results}

@app.get("/api/taxonomy")
def get_taxonomy():
    try:
        from src.config import CATEGORIES, SUBCATEGORIES, SENTIMENTS
        return {
            "categories": CATEGORIES,
            "subcategories": SUBCATEGORIES,
            "sentiments": SENTIMENTS,
        }
    except Exception:
        return {
            "categories": ["Gameplay", "Progression", "Monetization", "Experience", "Competition & Social"],
            "subcategories": {},
            "sentiments": ["positive", "negative", "mixed", "neutral"],
        }

@app.get("/api/reviews")
def get_reviews(
    query: str = Query("", max_length=200),
    game: str = "All",
    category: str = "All",
    subcategory: str = "All",
    sentiment: str = "All",
    rating: str = "All",
    days: int = Query(0, ge=0, le=3650),
    start_date: str = Query("", max_length=10),
    end_date: str = Query("", max_length=10),
    limit: int = Query(200, ge=0, le=10000)
):
    # Validate game
    if game != "All" and game not in GAMES:
        raise HTTPException(status_code=400, detail=f"Invalid game parameter '{game}'")

    # Validate rating
    if rating != "All":
        try:
            r_num = int(rating)
            if r_num < 1 or r_num > 5:
                raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid rating format")

    # Validate date format (YYYY-MM-DD)
    date_regex = r"^\d{4}-\d{2}-\d{2}$"
    if start_date and not re.match(date_regex, start_date):
        raise HTTPException(status_code=400, detail="start_date must be in YYYY-MM-DD format")
    if end_date and not re.match(date_regex, end_date):
        raise HTTPException(status_code=400, detail="end_date must be in YYYY-MM-DD format")

    df, _ = load_data_df()
    if df.empty:
        return {"reviews": []}
        
    filtered = df.copy()
    if query:
        filtered = filtered[filtered["review_text"].fillna("").str.contains(query, case=False, regex=False)]
    if game and game != "All":
        filtered = filtered[filtered["game"] == game]
    if category and category != "All":
        filtered = filtered[filtered["primary_category"] == category]
    if subcategory and subcategory != "All":
        filtered = filtered[filtered["subcategory"] == subcategory]
    if sentiment and sentiment != "All":
        filtered = filtered[filtered["sentiment"].fillna("").str.lower() == sentiment.lower()]
    if rating and rating != "All":
        r_num = int(rating)
        filtered = filtered[filtered["rating"] == r_num]
            
    # Date Filtering
    if "review_date" in filtered.columns and not filtered.empty:
        try:
            filtered["parsed_date"] = pd.to_datetime(filtered["review_date"], errors="coerce", utc=True)
            if days > 0:
                cutoff = pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=days)
                filtered = filtered[filtered["parsed_date"] >= cutoff]
            if start_date:
                s_dt = pd.to_datetime(start_date, errors="coerce", utc=True)
                if pd.notna(s_dt):
                    filtered = filtered[filtered["parsed_date"] >= s_dt]
            if end_date:
                e_dt = pd.to_datetime(end_date + " 23:59:59", errors="coerce", utc=True)
                if pd.notna(e_dt):
                    filtered = filtered[filtered["parsed_date"] <= e_dt]
        except Exception:
            pass
        
    # Take top limit
    if limit > 0:
        filtered = filtered.head(limit)
    if "parsed_date" in filtered.columns:
        filtered = filtered.drop(columns=["parsed_date"])
    
    # Fill NaN for JSON serialization
    filtered = filtered.fillna("")
    
    return {"reviews": filtered.to_dict("records")}

@app.get("/api/runs")
def get_runs():
    _, runs_df = load_data_df()
    if runs_df.empty:
        return {"runs": []}
    
    runs_df = runs_df.fillna("")
    return {"runs": runs_df.to_dict("records")}

_brief_file_cache: dict[str, str] = {}

@app.get("/api/brief")
@app.get("/api/briefs/latest")
def get_latest_brief(game: str = "all"):
    """
    Read-only endpoint to retrieve the most recently generated Founder Brief.
    Strictly NEVER triggers Gemini or generates briefs dynamically on GET requests.
    Briefs are exclusively generated once during Pipeline Execution.
    """
    sanitized_game = game.strip().lower()
    # Normalize common game aliases
    if sanitized_game == "tennis":
        sanitized_game = "tennis_clash"
    elif sanitized_game == "baseball":
        sanitized_game = "baseball_clash"

    if sanitized_game != "all" and sanitized_game not in GAMES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid game parameter '{game}'. Allowed: {list(GAMES.keys())} or 'all'"
        )

    # Check in-memory cache first for instant sub-millisecond response
    if sanitized_game in _brief_file_cache:
        content = _brief_file_cache[sanitized_game]
        return {"brief": content, "content": content, "game": sanitized_game, "status": "ok"}

    search_dirs = [OUTPUTS_DIR.resolve(), (PROJECT_ROOT / "outputs").resolve()]
    target_files = []

    for d in search_dirs:
        if not d.exists():
            continue
        if sanitized_game == "all":
            target_files.extend(d.glob("**/founder_brief_global.md"))
            target_files.extend(d.glob("**/founder_brief_all.md"))
            target_files.extend(d.glob("founder_brief_global.md"))
            target_files.extend(d.glob("founder_brief_all.md"))
        else:
            target_files.extend(d.glob(f"**/founder_brief_{sanitized_game}.md"))
            target_files.extend(d.glob(f"founder_brief_{sanitized_game}.md"))

    valid_files = [f for f in target_files if f.is_file()]
    if valid_files:
        target_file = sorted(valid_files)[-1]
        try:
            content = target_file.read_text(encoding="utf-8")
            if "0 reviews analyzed" not in content and len(content.strip()) > 20:
                _brief_file_cache[sanitized_game] = content
                return {"brief": content, "content": content, "game": sanitized_game, "status": "ok"}
        except Exception as e:
            logger.warning(f"Error reading pre-generated brief file: {e}")

    # If no pre-generated brief file is found, return not_generated (Zero LLM calls on GET)
    return {
        "brief": None,
        "content": None,
        "game": sanitized_game,
        "status": "not_generated",
        "message": f"No pre-generated brief exists for {sanitized_game}. Run the pipeline to synthesize an executive brief."
    }

@app.get("/api/docs/{doc_name}")
def get_doc(doc_name: str):
    sanitized_name = doc_name.lower().strip()
    filename = ALLOWED_DOCS.get(sanitized_name)
    if not filename:
        raise HTTPException(status_code=404, detail="Document not found")
        
    doc_path = (PROJECT_ROOT / filename).resolve()
    try:
        doc_path.relative_to(PROJECT_ROOT)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not doc_path.is_file():
        raise HTTPException(status_code=404, detail="Document file does not exist")
        
    try:
        content = doc_path.read_text(encoding="utf-8")
        return {"title": filename, "content": content}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to read document")

@app.get("/api/pipeline/stream")
def stream_pipeline(
    stages: str = Query("all", max_length=100),
    max_reviews: int = Query(150, ge=1, le=5000),
    days: int = Query(90, ge=1, le=365),
    games: str = Query("", max_length=100),
    fresh: bool = True
):
    # Validate stages against whitelist
    stage_list = [s.strip().lower() for s in stages.split(",") if s.strip()]
    if not stage_list or any(s not in VALID_STAGES for s in stage_list):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stages parameter. Allowed values: {sorted(list(VALID_STAGES))}"
        )

    # Validate games against whitelist
    games_list = [g.strip().lower() for g in games.split(",") if g.strip()]
    if games_list and "all" not in games_list:
        for g in games_list:
            if g not in GAMES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid game identifier '{g}'. Allowed values: {list(GAMES.keys())} or 'all'"
                )

    # Concurrency control
    acquired = pipeline_lock.acquire(blocking=False)
    if not acquired:
        raise HTTPException(
            status_code=429,
            detail="A pipeline execution is already in progress. Please wait for it to finish."
        )

    def event_stream():
        try:
            from src.ingestion.fetcher import fetch_reviews_for_game
            from src.cleaning.cleaner import clean_batch
            from src.classification.classifier import classify_batch, get_active_model_name
            from src.scoring.priority import compute_all_games_priority, format_priority_for_display
            from src.analysis.competitor import build_competitor_matrix
            from src.reporting.brief import generate_founder_brief, generate_global_market_brief
            from src.ingestion.storage import (
                get_connection,
                insert_review,
                insert_classification,
                purge_game_reviews,
                get_unclassified_reviews,
                get_classified_reviews,
                log_pipeline_run
            )

            target_games = games_list if games_list and "all" not in games_list else list(GAMES.keys())
            game_names_str = ", ".join([GAMES.get(g, {}).get("name", g) for g in target_games])

            yield f"data: {json.dumps({'type': 'status', 'msg': 'Initializing review intelligence pipeline for: ' + game_names_str})}\n\n"

            conn = get_connection()
            if not conn:
                raise RuntimeError("Failed to connect to local telemetry database.")

            # ─────────────────────────────────────────────
            # 1. INGEST STAGE (Per-game streaming logs)
            # ─────────────────────────────────────────────
            all_raw_by_game = {}
            if "all" in stage_list or "ingest" in stage_list:
                yield f"data: {json.dumps({'type': 'log', 'msg': '=================================================='})}\n\n"
                yield f"data: {json.dumps({'type': 'log', 'msg': f'STAGE 1/4: INGEST (Fetching Google Play reviews, max={max_reviews}, fresh={fresh})'})}\n\n"
                yield f"data: {json.dumps({'type': 'log', 'msg': '=================================================='})}\n\n"

                total_stored_all = 0
                for g_key in target_games:
                    g_meta = GAMES.get(g_key, {})
                    g_name = g_meta.get("name", g_key)
                    g_pkg = g_meta.get("google_play_id", "")

                    if fresh:
                        yield f"data: {json.dumps({'type': 'log', 'msg': f'[{g_name}] Fresh mode enabled: purging prior review records...'})}\n\n"
                        purge_game_reviews(conn, g_key)

                    yield f"data: {json.dumps({'type': 'log', 'msg': f'[{g_name}] Connecting to Google Play store endpoint (pkg: {g_pkg})...'})}\n\n"
                    raw_reviews = fetch_reviews_for_game(
                        g_key,
                        max_reviews=max_reviews,
                        window_days=days,
                        source_preference="auto"
                    )
                    all_raw_by_game[g_key] = raw_reviews
                    yield f"data: {json.dumps({'type': 'log', 'msg': f'[{g_name}] Retrieved {len(raw_reviews)} raw reviews.'})}\n\n"

                    # Clean & Deduplicate
                    clean_res = clean_batch(raw_reviews)
                    n_cleaned = len(clean_res["cleaned"])
                    n_skipped = clean_res["skipped_empty"]
                    yield f"data: {json.dumps({'type': 'log', 'msg': f'[{g_name}] Cleaned: {n_cleaned} reviews within {days}-day window (skipped {n_skipped} short/empty).'})}\n\n"

                    # Persist to Local Database
                    new_count = 0
                    for rev in clean_res["cleaned"]:
                        ok = insert_review(
                            conn,
                            game=rev["game"],
                            review_id=rev["review_id"],
                            review_date=rev["review_date"],
                            rating=rev["rating"],
                            review_text=rev["review_text"],
                            app_version=rev.get("app_version"),
                            thumbs_up=rev.get("thumbs_up", 0),
                        )
                        if ok:
                            new_count += 1

                    total_stored_all += new_count
                    
                    try:
                        game_total_row = conn.execute("SELECT COUNT(*) as cnt FROM reviews WHERE game = ?", (g_key,)).fetchone()
                        game_total_in_db = game_total_row["cnt"] if game_total_row else new_count
                    except Exception:
                        game_total_in_db = new_count

                    existing_retained = max(0, game_total_in_db - new_count)
                    if fresh:
                        yield f"data: {json.dumps({'type': 'log', 'msg': f'[{g_name}] Fresh Ingestion: {new_count} reviews stored.'})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'log', 'msg': f'[{g_name}] Incremental Merge: +{new_count} new reviews added | {existing_retained} historical reviews preserved (Total: {game_total_in_db} reviews in DB).'})}\n\n"

                yield f"data: {json.dumps({'type': 'log', 'msg': f'Ingestion Stage Complete: +{total_stored_all} new reviews merged into database.'})}\n\n"

            # ─────────────────────────────────────────────
            # 2. CLASSIFY STAGE
            # ─────────────────────────────────────────────
            model_name = get_active_model_name()
            total_classified = 0
            total_failures = 0
            if "all" in stage_list or "classify" in stage_list:
                yield f"data: {json.dumps({'type': 'log', 'msg': '=================================================='})}\n\n"
                yield f"data: {json.dumps({'type': 'log', 'msg': 'STAGE 2/4: CLASSIFY (NLP Taxonomy & Sentiment Extraction)'})}\n\n"
                yield f"data: {json.dumps({'type': 'log', 'msg': '=================================================='})}\n\n"

                unclassified = get_unclassified_reviews(conn)
                if target_games:
                    unclassified = [r for r in unclassified if r["game"] in target_games]

                if not unclassified:
                    yield f"data: {json.dumps({'type': 'log', 'msg': 'All reviews are already classified in local database.'})}\n\n"
                else:
                    total_unclass = len(unclassified)
                    yield f"data: {json.dumps({'type': 'log', 'msg': f'Found {total_unclass} reviews requiring NLP taxonomy classification.'})}\n\n"

                    chunk_size = 15
                    for i in range(0, total_unclass, chunk_size):
                        chunk = unclassified[i : i + chunk_size]
                        chunk_results = classify_batch(chunk)

                        for review, classification, model_used, is_fallback in chunk_results:
                            insert_classification(
                                conn,
                                review_db_id=review["id"],
                                primary_category=classification.primary_category,
                                subcategory=classification.subcategory,
                                sentiment=classification.sentiment,
                                severity=classification.severity,
                                business_impact=classification.business_impact,
                                issue=classification.issue,
                                actionability=classification.actionability,
                                confidence=classification.confidence,
                                model_used=model_used,
                            )
                            total_classified += 1

                        pct = int((total_classified / total_unclass) * 100)
                        sample_cat = chunk_results[0][1].primary_category if chunk_results else "Gameplay"
                        sample_sub = chunk_results[0][1].subcategory if chunk_results else "Match / mechanics"
                        yield f"data: {json.dumps({'type': 'log', 'msg': f'[NLP Progress] {total_classified}/{total_unclass} categorized ({pct}%) -> Sample: {sample_cat} > {sample_sub}'})}\n\n"

                    yield f"data: {json.dumps({'type': 'log', 'msg': f'Classification Stage Complete: {total_classified} reviews tagged using {model_name}.'})}\n\n"

            # ─────────────────────────────────────────────
            # 3. SCORE & BENCHMARK STAGE
            # ─────────────────────────────────────────────
            priority_by_game = {}
            matrix_data = {}
            all_classified = []
            if "all" in stage_list or "score" in stage_list:
                yield f"data: {json.dumps({'type': 'log', 'msg': '=================================================='})}\n\n"
                yield f"data: {json.dumps({'type': 'log', 'msg': 'STAGE 3/4: SCORE + BENCHMARK (4-Component Priority Model)'})}\n\n"
                yield f"data: {json.dumps({'type': 'log', 'msg': '=================================================='})}\n\n"

                all_classified = get_classified_reviews(conn, days=days)
                yield f"data: {json.dumps({'type': 'log', 'msg': f'Computing scores across {len(all_classified)} classified reviews (Formula: 0.30*Freq + 0.25*Sev + 0.25*Impact + 0.20*Trend)...'})}\n\n"

                priority_by_game = compute_all_games_priority(all_classified)
                matrix_data = build_competitor_matrix(all_classified)

                for g_key, p_list in priority_by_game.items():
                    if g_key in target_games and p_list:
                        g_name = GAMES.get(g_key, {}).get("name", g_key)
                        top_p = p_list[0]
                        p_cat = top_p["primary_category"]
                        p_sub = top_p["subcategory"]
                        p_score = top_p["priority_score"]
                        p_freq = top_p.get("frequency_pct", 0)
                        yield f"data: {json.dumps({'type': 'log', 'msg': f'[{g_name} #1 Priority] {p_cat} > {p_sub} (Priority Score: {p_score:.1f}/100, Freq: {p_freq:.1f}%)'})}\n\n"

                yield f"data: {json.dumps({'type': 'log', 'msg': 'Built 5x3 Competitor Benchmark Matrix across Gameplay, Progression, Monetization, Experience, Competition.'})}\n\n"

            # ─────────────────────────────────────────────
            # 4. BRIEF SYNTHESIS STAGE
            # ─────────────────────────────────────────────
            if "all" in stage_list or "brief" in stage_list:
                yield f"data: {json.dumps({'type': 'log', 'msg': '=================================================='})}\n\n"
                yield f"data: {json.dumps({'type': 'log', 'msg': 'STAGE 4/4: SYNTHESIZE EXECUTIVE BRIEFS (Gemini Intelligence)'})}\n\n"
                yield f"data: {json.dumps({'type': 'log', 'msg': '=================================================='})}\n\n"

                if not all_classified:
                    all_classified = get_classified_reviews(conn, days=days)
                    if all_classified and not priority_by_game:
                        priority_by_game = compute_all_games_priority(all_classified)
                        matrix_data = build_competitor_matrix(all_classified)

                # Generate game-specific briefs
                for g_key in target_games:
                    g_name = GAMES.get(g_key, {}).get("name", g_key)
                    g_priorities = priority_by_game.get(g_key, [])
                    g_reviews = [r for r in all_classified if r.get("game") == g_key]
                    if g_reviews or g_priorities:
                        yield f"data: {json.dumps({'type': 'log', 'msg': f'[{g_name}] Synthesizing 90-Second Executive Decision Memo...'})}\n\n"
                        generate_founder_brief(
                            game_key=g_key,
                            classified_reviews=g_reviews,
                            priority_scores=g_priorities,
                            matrix_data=matrix_data,
                            output_dir=OUTPUTS_DIR,
                        )
                        yield f"data: {json.dumps({'type': 'log', 'msg': f'[{g_name}] Executive brief generated successfully.'})}\n\n"

                # Generate global benchmark brief
                yield f"data: {json.dumps({'type': 'log', 'msg': 'Synthesizing Cross-Game Global Market Intelligence Brief...'})}\n\n"
                generate_global_market_brief(
                    all_classified=all_classified,
                    priority_by_game=priority_by_game,
                    matrix_data=matrix_data,
                    output_dir=OUTPUTS_DIR,
                )
                yield f"data: {json.dumps({'type': 'log', 'msg': 'Global market intelligence brief generated successfully.'})}\n\n"

            # Record run log to Neon PostgreSQL
            try:
                log_pipeline_run(
                    conn,
                    reviews_fetched=len(all_classified),
                    within_90_days=len(all_classified),
                    new_reviews=len(all_classified),
                    classified=len(all_classified),
                    model_used=get_active_model_name(),
                    output_dir=str(OUTPUTS_DIR),
                    stages_run=",".join(stage_list),
                    notes="Executed via Web Pipeline Console"
                )
            except Exception:
                pass

            yield f"data: {json.dumps({'type': 'log', 'msg': '=================================================='})}\n\n"
            yield f"data: {json.dumps({'type': 'log', 'msg': 'PIPELINE EXECUTION COMPLETE: All telemetry refreshed in local database.'})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'code': 0})}\n\n"

        except Exception as e:
            logger.error(f"Pipeline execution error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'msg': str(e)})}\n\n"
        finally:
            try:
                if conn:
                    conn.close()
            except Exception:
                pass
            if pipeline_lock.locked():
                try:
                    pipeline_lock.release()
                except RuntimeError:
                    pass

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

@app.post("/api/pipeline/stop")
def stop_pipeline():
    """Cancel and terminate any currently running pipeline subprocess."""
    global active_process
    with active_process_lock:
        if active_process is not None and active_process.poll() is None:
            try:
                active_process.terminate()
                try:
                    active_process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    active_process.kill()
            except Exception:
                pass
            active_process = None
            if pipeline_lock.locked():
                try:
                    pipeline_lock.release()
                except RuntimeError:
                    pass
            return {"status": "success", "message": "Pipeline execution stopped successfully"}
            
    # Also ensure lock is released if orphaned
    if pipeline_lock.locked():
        try:
            pipeline_lock.release()
        except RuntimeError:
            pass
            
    return {"status": "idle", "message": "No active pipeline process was running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.index:app", host="127.0.0.1", port=8000, reload=True)


