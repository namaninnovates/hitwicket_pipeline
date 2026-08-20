#!/usr/bin/env python3
"""
Hitwicket Review Intelligence Pipeline — Main Orchestrator

Usage:
    python run_pipeline.py                    # Run all stages
    python run_pipeline.py --stages ingest    # Run only ingestion
    python run_pipeline.py --stages ingest classify score brief
    python run_pipeline.py --max-reviews 300  # Limit reviews per game
    python run_pipeline.py --games hitwicket  # Only one game

All stages:
    ingest    → Fetch reviews from Google Play, store in SQLite
    clean     → Already handled during ingestion
    classify  → LLM classification of unclassified reviews
    score     → Compute priority scores
    brief     → Generate founder brief and HTML report
"""

import argparse
import logging
import sys
import time
from datetime import datetime
from pathlib import Path

# ─────────────────────────────────────────────
# Setup path
# ─────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.config import (
    GAMES,
    OUTPUTS_DIR,
    REVIEW_WINDOW_DAYS,
    MAX_REVIEWS_PER_GAME,
    GEMINI_API_KEY,
)
from src.ingestion.storage import (
    initialize_db,
    get_connection,
    insert_review,
    insert_classification,
    log_pipeline_run,
    get_unclassified_reviews,
    get_classified_reviews,
    purge_game_reviews,
)
from src.ingestion.fetcher import fetch_all_games
from src.cleaning.cleaner import clean_batch
from src.classification.classifier import classify_batch, get_active_model_name
from src.scoring.priority import compute_all_games_priority, format_priority_for_display
from src.analysis.competitor import build_competitor_matrix, format_competitor_matrix
from src.reporting.brief import generate_founder_brief, generate_global_market_brief
from src.reporting.html_report import generate_html_report

# ─────────────────────────────────────────────
# Logging setup
# ─────────────────────────────────────────────
def setup_logging(verbose: bool = False):
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
        datefmt="%H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Stage: INGEST
# ─────────────────────────────────────────────
def stage_ingest(game_keys: list[str], max_reviews: int, window_days: int, source: str = "auto", fresh: bool = False) -> dict:
    """Fetch and store reviews. Returns ingest stats."""
    logger.info("=" * 50)
    logger.info(f"STAGE: INGEST (source: {source}, fresh: {fresh})")
    logger.info("=" * 50)

    stats = {
        "reviews_fetched": 0,
        "within_90_days": 0,
        "new_reviews": 0,
        "skipped_date": 0,
        "skipped_empty": 0,
    }

    raw_by_game = fetch_all_games(
        game_keys=game_keys,
        max_reviews=max_reviews,
        window_days=window_days,
        source_preference=source,
    )

    conn = get_connection()
    with conn:
        for game_key, raw_reviews in raw_by_game.items():
            if fresh:
                logger.info(f"[{GAMES[game_key]['name']}] Fresh mode: Purging prior records for {game_key}")
                purge_game_reviews(conn, game_key)

            stats["reviews_fetched"] += len(raw_reviews)

            # Clean
            clean_result = clean_batch(raw_reviews)
            stats["skipped_date"] += clean_result["skipped_date"]
            stats["skipped_empty"] += clean_result["skipped_empty"]
            stats["within_90_days"] += len(clean_result["cleaned"])

            # Store
            new_count = 0
            for review in clean_result["cleaned"]:
                inserted = insert_review(
                    conn,
                    game=review["game"],
                    review_id=review["review_id"],
                    review_date=review["review_date"],
                    rating=review["rating"],
                    review_text=review["review_text"],
                    app_version=review.get("app_version"),
                    thumbs_up=review.get("thumbs_up", 0),
                )
                if inserted:
                    new_count += 1

            stats["new_reviews"] += new_count
            logger.info(
                f"[{GAMES[game_key]['name']}] Stored: {new_count} new reviews "
                f"(of {len(clean_result['cleaned'])} within window)"
            )
    conn.close()

    return stats


# ─────────────────────────────────────────────
# Stage: CLASSIFY
# ─────────────────────────────────────────────
def stage_classify(game_keys: list[str]) -> dict:
    """Classify all unclassified reviews. Returns classify stats."""
    logger.info("=" * 50)
    logger.info("STAGE: CLASSIFY")
    logger.info("=" * 50)

    stats = {"classified": 0, "failures": 0, "model": "rule_based_nlp"}

    conn = get_connection()

    # Get all unclassified reviews
    unclassified = get_unclassified_reviews(conn)
    # Filter to requested games
    if game_keys:
        unclassified = [r for r in unclassified if r["game"] in game_keys]

    if not unclassified:
        logger.info("No unclassified reviews found — all up to date")
        conn.close()
        return {"classified": 0, "failures": 0, "model": get_active_model_name()}

    logger.info(f"Classifying {len(unclassified)} reviews...")

    results = classify_batch(unclassified)
    stats["model"] = get_active_model_name()

    with conn:
        for review, classification, model_name, is_fallback in results:
            if is_fallback and classification.confidence == 0.0:
                stats["failures"] += 1
            else:
                stats["classified"] += 1

            ok = insert_classification(
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
                model_used=model_name,
                classification_raw=None,
            )
            if not ok:
                stats["failures"] += 1

    conn.close()

    logger.info(
        f"Classification complete: {stats['classified']} classified, "
        f"{stats['failures']} failures, model={stats['model']}"
    )
    return stats


# ─────────────────────────────────────────────
# Stage: SCORE + ANALYZE
# ─────────────────────────────────────────────
def stage_score() -> tuple[dict, dict, dict]:
    """Compute priority scores and competitor matrix. Returns (priorities_by_game, matrix_data, raw_by_game)."""
    logger.info("=" * 50)
    logger.info("STAGE: SCORE + ANALYZE")
    logger.info("=" * 50)

    conn = get_connection()
    all_classified = get_classified_reviews(conn, days=REVIEW_WINDOW_DAYS)
    conn.close()

    if not all_classified:
        logger.warning("No classified reviews found. Run classify stage first.")
        return {}, {"matrix": {}, "data_note": "No data", "raw": {}, "game_totals": {}}, {}

    logger.info(f"Scoring {len(all_classified)} classified reviews")

    # Priority by game
    priority_by_game = compute_all_games_priority(all_classified)

    # Print top issues for Hitwicket
    hw_priorities = priority_by_game.get("hitwicket", [])
    if hw_priorities:
        logger.info("\n── Top Priority Issues: Hitwicket ──")
        for p in hw_priorities[:5]:
            logger.info(f"\n{format_priority_for_display(p)}")

    # Competitor matrix
    matrix_data = build_competitor_matrix(all_classified)
    logger.info("\n── Competitor Matrix ──")
    logger.info("\n" + format_competitor_matrix(matrix_data))

    return priority_by_game, matrix_data, all_classified


# ─────────────────────────────────────────────
# Stage: BRIEF
# ─────────────────────────────────────────────
def stage_brief(priority_by_game: dict, matrix_data: dict, all_classified: list, output_dir: Path) -> Path:
    """Generate founder brief and HTML report."""
    logger.info("=" * 50)
    logger.info("STAGE: GENERATE BRIEF")
    logger.info("=" * 50)

    # Generate briefs for each game that has classified reviews
    hw_brief_path = None
    for game_key in GAMES.keys():
        g_priorities = priority_by_game.get(game_key, [])
        g_reviews = [r for r in all_classified if r.get("game") == game_key]
        if g_reviews or g_priorities:
            b_path = generate_founder_brief(
                game_key=game_key,
                classified_reviews=g_reviews,
                priority_scores=g_priorities,
                matrix_data=matrix_data,
                output_dir=output_dir,
            )
            if game_key == "hitwicket":
                hw_brief_path = b_path

    # Generate global relative market intelligence brief
    generate_global_market_brief(
        all_classified=all_classified,
        priority_by_game=priority_by_game,
        matrix_data=matrix_data,
        output_dir=output_dir,
    )

    if not hw_brief_path:
        hw_brief_path = output_dir / "founder_brief_hitwicket.md"

    # Generate HTML report
    html_path = generate_html_report(
        all_classified=all_classified,
        priority_by_game=priority_by_game,
        matrix_data=matrix_data,
        brief_path=hw_brief_path,
        output_dir=output_dir,
    )

    return html_path


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Hitwicket Review Intelligence Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--stages",
        nargs="+",
        choices=["ingest", "classify", "score", "brief", "all"],
        default=["all"],
        help="Pipeline stages to run (default: all)",
    )
    parser.add_argument(
        "--games",
        nargs="+",
        choices=list(GAMES.keys()),
        default=list(GAMES.keys()),
        help="Games to process (default: all)",
    )
    parser.add_argument(
        "--max-reviews",
        type=int,
        default=MAX_REVIEWS_PER_GAME,
        help=f"Max reviews to fetch per game (default: {MAX_REVIEWS_PER_GAME})",
    )
    parser.add_argument(
        "--window-days",
        type=int,
        default=REVIEW_WINDOW_DAYS,
        help=f"Review window in days (default: {REVIEW_WINDOW_DAYS})",
    )
    parser.add_argument(
        "--source",
        choices=["auto", "google_play", "apify"],
        default="auto",
        help="Review source provider (default: auto)",
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        default=False,
        help="Purge previous reviews for target games to ensure 100% fresh ingestion",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose logging",
    )

    args = parser.parse_args()
    setup_logging(args.verbose)

    run_all = "all" in args.stages
    stages = set(args.stages if not run_all else ["ingest", "classify", "score", "brief"])

    # Output directory (dated)
    run_date = datetime.now().strftime("%Y-%m-%d")
    output_dir = OUTPUTS_DIR / run_date
    output_dir.mkdir(parents=True, exist_ok=True)

    # Initialize DB
    initialize_db()

    start_time = time.time()
    run_stats = {
        "reviews_fetched": 0,
        "within_90_days": 0,
        "new_reviews": 0,
        "classified": 0,
        "classification_failures": 0,
        "model_used": "N/A",
        "output_dir": str(output_dir),
        "stages_run": ", ".join(sorted(stages)),
    }

    html_path = None

    # ── INGEST ──
    if "ingest" in stages:
        ingest_stats = stage_ingest(
            game_keys=args.games,
            max_reviews=args.max_reviews,
            window_days=args.window_days,
            source=args.source,
            fresh=args.fresh,
        )
        run_stats.update(ingest_stats)

    # ── CLASSIFY ──
    if "classify" in stages:
        classify_stats = stage_classify(game_keys=args.games)
        run_stats["classified"] = classify_stats["classified"]
        run_stats["classification_failures"] = classify_stats["failures"]
        run_stats["model_used"] = classify_stats["model"]

    # ── SCORE + ANALYZE ──
    priority_by_game = {}
    matrix_data = {}
    all_classified = []

    if "score" in stages or "brief" in stages:
        priority_by_game, matrix_data, all_classified = stage_score()

    # ── BRIEF ──
    if "brief" in stages:
        html_path = stage_brief(priority_by_game, matrix_data, all_classified, output_dir)

    # ── LOG RUN ──
    elapsed = time.time() - start_time
    conn = get_connection()
    with conn:
        log_pipeline_run(conn, **run_stats)
    conn.close()

    # ── PRINT SUMMARY ──
    print("\n" + "=" * 45)
    print("Run completed")
    print("-" * 45)
    print(f"Reviews fetched:     {run_stats.get('reviews_fetched', 'N/A')}")
    print(f"Within 90 days:      {run_stats.get('within_90_days', 'N/A')}")
    print(f"New reviews:         {run_stats.get('new_reviews', 'N/A')}")
    print(f"Classified:          {run_stats.get('classified', 'N/A')}")
    print(f"Failures:            {run_stats.get('classification_failures', 'N/A')}")
    print(f"Games:               {len(args.games)}")
    print(f"Model:               {run_stats.get('model_used', 'N/A')}")
    print(f"Elapsed:             {elapsed:.1f}s")
    print(f"Output:              {output_dir}")
    if html_path:
        print(f"HTML Report:         {html_path}")
    print("=" * 45 + "\n")

    if html_path:
        print(f"Open the report: open '{html_path}'")


if __name__ == "__main__":
    main()
