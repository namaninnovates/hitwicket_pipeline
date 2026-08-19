"""
Fetches Google Play reviews for all configured games.
- Paginates using continuation_token
- Stops when reviews fall outside the 90-day window
- Politely rate-limits between requests
"""

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import (
    GAMES,
    REVIEW_WINDOW_DAYS,
    MAX_REVIEWS_PER_GAME,
    FETCH_BATCH_SIZE,
    FETCH_SLEEP_SECONDS,
    REVIEW_LANG,
    REVIEW_COUNTRY,
)

logger = logging.getLogger(__name__)


def fetch_reviews_for_game(
    game_key: str,
    max_reviews: int = MAX_REVIEWS_PER_GAME,
    window_days: int = REVIEW_WINDOW_DAYS,
    source_preference: str = "auto",
) -> list[dict]:
    """
    Fetch reviews for a single game from Google Play (or Apify if configured).

    Returns a list of raw review dicts with normalized field names.
    Only returns reviews within the last `window_days` days.
    Stops fetching when reviews are older than the window (saves time).
    """
    from src.ingestion.apify_fetcher import is_apify_configured, fetch_reviews_via_apify_google_play

    game = GAMES[game_key]
    package_id = game["google_play_id"]
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=window_days)

    # Use Apify if explicitly requested or if configured
    if source_preference == "apify" or (source_preference == "auto" and is_apify_configured()):
        try:
            logger.info(f"[{game['name']}] Fetching via Apify API...")
            reviews = fetch_reviews_via_apify_google_play(game_key, max_reviews, window_days)
            if reviews:
                return reviews
            logger.warning(f"[{game['name']}] Apify returned 0 reviews, falling back to local scraper")
        except Exception as e:
            logger.warning(f"[{game['name']}] Apify fetch error: {e}. Falling back to local scraper")

    from google_play_scraper import reviews as gp_reviews, Sort

    logger.info(f"[{game['name']}] Fetching from Google Play (pkg: {package_id})")
    logger.info(f"[{game['name']}] Cutoff date: {cutoff_date.date()}")

    all_reviews: list[dict] = []
    continuation_token = None
    total_fetched = 0
    stopped_early = False

    while total_fetched < max_reviews:
        batch_size = min(FETCH_BATCH_SIZE, max_reviews - total_fetched)

        try:
            batch, continuation_token = gp_reviews(
                package_id,
                lang=REVIEW_LANG,
                country=REVIEW_COUNTRY,
                sort=Sort.NEWEST,
                count=batch_size,
                continuation_token=continuation_token,
            )
        except Exception as e:
            logger.error(f"[{game['name']}] Error fetching reviews: {e}")
            break

        if not batch:
            logger.info(f"[{game['name']}] No more reviews returned")
            break

        # Normalize and filter
        within_window = 0
        for r in batch:
            total_fetched += 1
            # google-play-scraper returns naive or aware datetimes
            review_at = r.get("at")
            if review_at is None:
                continue

            # Make timezone-aware for comparison
            if review_at.tzinfo is None:
                review_at = review_at.replace(tzinfo=timezone.utc)

            if review_at < cutoff_date:
                # Reviews are newest-first; once we hit old ones, we can stop
                logger.info(
                    f"[{game['name']}] Reached reviews older than {window_days} days "
                    f"(batch pos {total_fetched}). Stopping."
                )
                stopped_early = True
                break

            within_window += 1
            all_reviews.append({
                "game": game_key,
                "source": "google_play",
                "review_id": r.get("reviewId", ""),
                "review_date": review_at.isoformat(),
                "rating": r.get("score"),
                "review_text": r.get("content", "").strip() if r.get("content") else None,
                "app_version": r.get("appVersion"),
                "thumbs_up": r.get("thumbsUpCount", 0) or 0,
            })

        logger.info(
            f"[{game['name']}] Batch: {len(batch)} fetched, {within_window} within window, "
            f"total collected: {len(all_reviews)}"
        )

        if stopped_early:
            break

        if not continuation_token:
            logger.info(f"[{game['name']}] No continuation token — end of available reviews")
            break

        time.sleep(FETCH_SLEEP_SECONDS)

    logger.info(f"[{game['name']}] Done. Total reviews within {window_days}d: {len(all_reviews)}")
    return all_reviews


def fetch_all_games(
    game_keys: Optional[list[str]] = None,
    max_reviews: int = MAX_REVIEWS_PER_GAME,
    window_days: int = REVIEW_WINDOW_DAYS,
    source_preference: str = "auto",
) -> dict[str, list[dict]]:
    """
    Fetch reviews for all (or selected) games.
    Returns dict keyed by game_key.
    """
    if game_keys is None:
        game_keys = list(GAMES.keys())

    results = {}
    for game_key in game_keys:
        if game_key not in GAMES:
            logger.warning(f"Unknown game key: {game_key}. Skipping.")
            continue
        results[game_key] = fetch_reviews_for_game(
            game_key,
            max_reviews=max_reviews,
            window_days=window_days,
            source_preference=source_preference,
        )

    return results
