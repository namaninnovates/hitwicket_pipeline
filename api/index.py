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
    if not conn:
        return pd.DataFrame(), pd.DataFrame()
    
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
        conn.close()
    
    return df, runs_df

# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────
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
            detail="Database connection failed. Please verify that DATABASE_URL is configured in your Vercel project environment variables."
        )
    try:
        # Guarantee tables exist before deletion
        try:
            if initialize_db:
                initialize_db(conn)
        except Exception:
            pass

        if is_postgres_connection(conn):
            with conn.cursor() as cur:
                cur.execute("DELETE FROM classifications;")
                cur.execute("DELETE FROM reviews;")
                cur.execute("DELETE FROM pipeline_runs;")
        else:
            with conn:
                conn.execute("DELETE FROM classifications")
                conn.execute("DELETE FROM reviews")
                conn.execute("DELETE FROM pipeline_runs")
            try:
                conn.isolation_level = None
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

        return {"status": "success", "message": "Database and telemetry reset successfully"}
    except Exception as e:
        logger.error(f"Failed to reset database: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset database: {e}")
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

@app.get("/api/brief")
@app.get("/api/briefs/latest")
def get_latest_brief(game: str = "all"):
    sanitized_game = game.strip().lower()
    if sanitized_game != "all" and sanitized_game not in GAMES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid game parameter '{game}'. Allowed: {list(GAMES.keys())} or 'all'"
        )

    # 1. First check if DB is empty
    df, _ = load_data_df()
    if df.empty or len(df[df["primary_category"].notna()]) == 0:
        return {"brief": None, "content": None, "game": sanitized_game, "status": "empty"}

    classified_records = df[df["primary_category"].notna()].to_dict("records")
    if not classified_records:
        return {"brief": None, "content": None, "game": sanitized_game, "status": "empty"}

    outputs_resolved = OUTPUTS_DIR.resolve()
    outputs_resolved.mkdir(parents=True, exist_ok=True)

    # 2. Check if a game-specific or global brief already exists for current dataset
    if sanitized_game == "all":
        target_files = [f for f in outputs_resolved.glob("**/founder_brief_global.md") if f.is_file()] or \
                       [f for f in outputs_resolved.glob("**/founder_brief_all.md") if f.is_file()]
    else:
        target_files = [f for f in outputs_resolved.glob(f"**/founder_brief_{sanitized_game}.md") if f.is_file()]

    if target_files:
        target_file = sorted(target_files)[-1]
        try:
            target_file.resolve().relative_to(outputs_resolved)
            content = target_file.read_text(encoding="utf-8")
            if "0 reviews analyzed" not in content:
                return {"brief": content, "content": content, "game": sanitized_game}
        except Exception:
            pass

    # 3. If brief doesn't exist yet, generate on demand from active database records
    try:
        from src.scoring.priority import compute_priority_scores
        from src.analysis.competitor import build_competitor_matrix
        from src.reporting.brief import generate_founder_brief, generate_global_market_brief

        matrix_data = build_competitor_matrix(classified_records)

        if sanitized_game == "all":
            priority_by_game = {
                g: compute_priority_scores(classified_records, game=g)
                for g in GAMES.keys()
            }
            brief_path = generate_global_market_brief(
                all_classified=classified_records,
                priority_by_game=priority_by_game,
                matrix_data=matrix_data,
                output_dir=OUTPUTS_DIR,
            )
        else:
            game_reviews = [r for r in classified_records if r.get("game") == sanitized_game]
            if not game_reviews:
                return {"brief": None, "content": None, "game": sanitized_game, "status": "empty"}
            priorities = compute_priority_scores(classified_records, game=sanitized_game)
            brief_path = generate_founder_brief(
                game_key=sanitized_game,
                classified_reviews=game_reviews,
                priority_scores=priorities,
                matrix_data=matrix_data,
                output_dir=OUTPUTS_DIR,
            )

        content = brief_path.read_text(encoding="utf-8")
        return {"brief": content, "content": content, "game": sanitized_game}
    except Exception as e:
        logger.error(f"Failed to generate on-demand brief for {sanitized_game}: {e}")

    return {"brief": None, "content": None, "game": sanitized_game, "status": "empty"}

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
        global active_process
        try:
            cmd = [
                sys.executable, "-u", "run_pipeline.py",
                "--stages", *stage_list,
                "--max-reviews", str(max_reviews),
                "--window-days", str(days)
            ]
            if fresh:
                cmd.append("--fresh")
            if games_list and "all" not in games_list:
                cmd += ["--games", *games_list]
                
            cmd_str = " ".join(cmd)
            yield f"data: {json.dumps({'type': 'status', 'msg': 'Executing: ' + cmd_str})}\n\n"
            
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                env=env,
                cwd=str(PROJECT_ROOT)
            )
            
            with active_process_lock:
                active_process = process
            
            for line in iter(process.stdout.readline, ""):
                if line:
                    yield f"data: {json.dumps({'type': 'log', 'msg': line.strip()})}\n\n"
                    
            process.stdout.close()
            return_code = process.wait()
            
            yield f"data: {json.dumps({'type': 'done', 'code': return_code})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'msg': str(e)})}\n\n"
        finally:
            with active_process_lock:
                active_process = None
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


