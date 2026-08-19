import os
import sqlite3
import subprocess
import sys
from pathlib import Path
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
import json

app = FastAPI()

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

try:
    from src.config import GAMES, DB_PATH, OUTPUTS_DIR, CATEGORIES
    from src.scoring.priority import compute_priority_scores
    from src.analysis.competitor import build_competitor_matrix, identify_hitwicket_specific_issues
except ImportError as e:
    print(f"Warning: Could not import src modules: {e}")
    GAMES = {}
    DB_PATH = Path("data/reviews.db")
    OUTPUTS_DIR = Path("outputs")
    CATEGORIES = []

def get_connection():
    if not DB_PATH.exists():
        return None
    return sqlite3.connect(DB_PATH)

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
    
    for game_key in GAMES.keys():
        metrics["games"][game_key] = calc_metrics(df[df["game"] == game_key])
        
    return metrics

@app.get("/api/priorities")
def get_priorities(game: str = "hitwicket"):
    df, _ = load_data_df()
    if df.empty:
        return {"priorities": []}
    
    classified_records = df[df["primary_category"].notna()].to_dict("records")
    if not classified_records:
        return {"priorities": []}
        
    priorities = compute_priority_scores(classified_records, game=game)
    
    # attach sample reviews
    for p in priorities:
        cat = p["primary_category"]
        subcat = p["subcategory"]
        
        sample_revs = df[
            (df["primary_category"] == cat) & 
            (df["subcategory"] == subcat) & 
            (df["game"] == game) &
            (df["review_text"].notna())
        ].head(3)
        
        samples = []
        for _, r in sample_revs.iterrows():
            samples.append({
                "rating": r["rating"],
                "text": r["review_text"],
                "date": r["review_date"][:10]
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

@app.get("/api/reviews")
def get_reviews(query: str = "", category: str = "All", limit: int = 100):
    df, _ = load_data_df()
    if df.empty:
        return {"reviews": []}
        
    filtered = df.copy()
    if query:
        filtered = filtered[filtered["review_text"].fillna("").str.contains(query, case=False)]
    if category and category != "All":
        filtered = filtered[filtered["primary_category"] == category]
        
    # Take top limit
    filtered = filtered.head(limit)
    
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

@app.get("/api/briefs/latest")
def get_latest_brief():
    if not OUTPUTS_DIR.exists():
        return {"content": None}
        
    brief_files = list(OUTPUTS_DIR.glob("**/founder_brief_*.md"))
    if not brief_files:
        return {"content": None}
        
    latest_brief = sorted(brief_files)[-1]
    content = latest_brief.read_text(encoding="utf-8")
    return {"content": content}

@app.get("/api/pipeline/stream")
def stream_pipeline(stages: str = "all", max_reviews: int = 100, games: str = ""):
    stage_list = stages.split(",")
    games_list = games.split(",") if games else []
    
    def event_stream():
        cmd = [sys.executable, "run_pipeline.py", "--stages"] + stage_list + ["--max-reviews", str(max_reviews)]
        if games_list and "all" not in games_list:
            cmd += ["--games"] + games_list
            
        yield f"data: {json.dumps({'type': 'status', 'msg': f'Executing: {' '.join(cmd)}'})}\n\n"
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=str(PROJECT_ROOT)
        )
        
        for line in iter(process.stdout.readline, ""):
            if line:
                yield f"data: {json.dumps({'type': 'log', 'msg': line.strip()})}\n\n"
                
        process.stdout.close()
        return_code = process.wait()
        
        yield f"data: {json.dumps({'type': 'done', 'code': return_code})}\n\n"
        
    return StreamingResponse(event_stream(), media_type="text/event-stream")
