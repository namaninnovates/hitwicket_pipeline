"""
Apify review ingestion adapter.
Allows fetching reviews using Apify Actors (e.g., Google Play and Apple App Store scrapers).
Requires APIFY_API_TOKEN in environment or .env.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import (
    GAMES,
    REVIEW_WINDOW_DAYS,
    MAX_REVIEWS_PER_GAME,
    REVIEW_LANG,
    REVIEW_COUNTRY,
)

logger = logging.getLogger(__name__)

APIFY_TOKEN = os.environ.get("APIFY_API_TOKEN") or os.environ.get("APIFY_TOKEN")


def is_apify_configured() -> bool:
    """Check if Apify token is available."""
    token = os.environ.get("APIFY_API_TOKEN") or os.environ.get("APIFY_TOKEN")
    return bool(token)


def fetch_reviews_via_apify_google_play(
    game_key: str,
    max_reviews: int = MAX_REVIEWS_PER_GAME,
    window_days: int = REVIEW_WINDOW_DAYS,
) -> list[dict]:
    """
    Fetch Google Play reviews using Apify Actor: compass/google-play-scraper.
    """
    token = os.environ.get("APIFY_API_TOKEN") or os.environ.get("APIFY_TOKEN")
    if not token:
        raise ValueError("APIFY_API_TOKEN is not configured.")

    from apify_client import ApifyClient

    client = ApifyClient(token)
    game = GAMES[game_key]
    package_id = game["google_play_id"]
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=window_days)

    logger.info(f"[{game['name']}] Fetching reviews via Apify Actor for {package_id}")

    run_input = {
        "appId": package_id,
        "maxReviews": max_reviews,
        "language": REVIEW_LANG,
        "country": REVIEW_COUNTRY,
        "sort": "NEWEST",
    }

    try:
        run = client.actor("compass/google-play-scraper").call(run_input=run_input)
        dataset_items = client.dataset(run["defaultDatasetId"]).iterate_items()

        reviews = []
        for item in dataset_items:
            date_val = item.get("date") or item.get("at")
            if not date_val:
                continue

            # Parse date
            try:
                if isinstance(date_val, str):
                    dt = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
                else:
                    dt = date_val
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue

            if dt < cutoff_date:
                continue

            reviews.append({
                "game": game_key,
                "source": "google_play_apify",
                "review_id": str(item.get("reviewId") or item.get("id") or f"{game_key}_{len(reviews)}"),
                "review_date": dt.isoformat(),
                "rating": item.get("score") or item.get("rating"),
                "review_text": (item.get("text") or item.get("content") or "").strip() or None,
                "app_version": item.get("version") or item.get("appVersion"),
                "thumbs_up": item.get("thumbsUp") or item.get("thumbsUpCount", 0) or 0,
            })

        logger.info(f"[{game['name']}] Apify returned {len(reviews)} reviews within window")
        return reviews

    except Exception as e:
        logger.error(f"[{game['name']}] Apify fetch failed: {e}")
        return []


def fetch_reviews_via_apify_app_store(
    game_key: str,
    max_reviews: int = MAX_REVIEWS_PER_GAME,
    window_days: int = REVIEW_WINDOW_DAYS,
) -> list[dict]:
    """
    Fetch Apple App Store reviews using Apify Actor: compass/app-store-scraper.
    """
    token = os.environ.get("APIFY_API_TOKEN") or os.environ.get("APIFY_TOKEN")
    if not token:
        raise ValueError("APIFY_API_TOKEN is not configured.")

    from apify_client import ApifyClient

    client = ApifyClient(token)
    game = GAMES[game_key]
    app_id = game.get("app_store_id")
    if not app_id:
        logger.warning(f"[{game['name']}] No app_store_id defined")
        return []

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=window_days)
    run_input = {
        "appId": str(app_id),
        "maxReviews": max_reviews,
        "country": REVIEW_COUNTRY,
        "sort": "mostRecent",
    }

    try:
        run = client.actor("compass/app-store-scraper").call(run_input=run_input)
        dataset_items = client.dataset(run["defaultDatasetId"]).iterate_items()

        reviews = []
        for item in dataset_items:
            date_val = item.get("date") or item.get("updated")
            if not date_val:
                continue

            try:
                if isinstance(date_val, str):
                    dt = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
                else:
                    dt = date_val
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue

            if dt < cutoff_date:
                continue

            reviews.append({
                "game": game_key,
                "source": "apple_store_apify",
                "review_id": str(item.get("id") or item.get("reviewId") or f"ios_{game_key}_{len(reviews)}"),
                "review_date": dt.isoformat(),
                "rating": item.get("score") or item.get("rating"),
                "review_text": (item.get("text") or item.get("review") or item.get("content") or "").strip() or None,
                "app_version": item.get("version"),
                "thumbs_up": item.get("voteCount", 0) or 0,
            })

        logger.info(f"[{game['name']}] Apify App Store returned {len(reviews)} reviews")
        return reviews

    except Exception as e:
        logger.error(f"[{game['name']}] Apify App Store fetch failed: {e}")
        return []
