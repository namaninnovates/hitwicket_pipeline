"""
Cleaning stage: validates and normalizes raw review data before storage.
"""

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import REVIEW_WINDOW_DAYS, MIN_REVIEW_LENGTH

logger = logging.getLogger(__name__)


def clean_text(text: Optional[str]) -> Optional[str]:
    """Normalize review text: strip whitespace, remove null bytes."""
    if text is None:
        return None
    text = text.strip()
    text = text.replace("\x00", "")
    text = re.sub(r"\s+", " ", text)
    return text if text else None


def is_within_window(review_date_str: Optional[str], window_days: int = REVIEW_WINDOW_DAYS) -> bool:
    """Return True if the review date is within the last N days."""
    if not review_date_str:
        return False
    try:
        dt = datetime.fromisoformat(review_date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        cutoff = datetime.now(timezone.utc) - timedelta(days=window_days)
        # Use date comparison for robust day-level windowing
        return dt.date() >= cutoff.date()
    except (ValueError, TypeError):
        return False


def is_substantive(review_text: Optional[str], min_length: int = MIN_REVIEW_LENGTH) -> bool:
    """Return True if the review text is long enough to be useful."""
    if not review_text:
        return False
    return len(review_text.strip()) >= min_length


def clean_review(raw: dict) -> Optional[dict]:
    """
    Clean a single raw review dict.
    Returns cleaned dict, or None if the review should be discarded.
    """
    # Clean text
    text = clean_text(raw.get("review_text"))

    # Date within window check
    review_date = raw.get("review_date")
    if not is_within_window(review_date):
        return None  # Outside our 90-day window

    return {
        "game": raw.get("game"),
        "source": raw.get("source", "google_play"),
        "review_id": raw.get("review_id", ""),
        "review_date": review_date,
        "rating": raw.get("rating"),
        "review_text": text,
        "app_version": raw.get("app_version"),  # May be None — stored as NULL
        "thumbs_up": raw.get("thumbs_up", 0),
        "is_substantive": is_substantive(text),
    }


def clean_batch(reviews: list[dict]) -> dict:
    """
    Clean a batch of raw reviews.
    Returns:
        {
          'cleaned': list of cleaned reviews that passed all filters,
          'skipped_date': count outside window,
          'skipped_empty': count with no useful text,
          'total': count processed,
        }
    """
    cleaned = []
    skipped_date = 0
    skipped_empty = 0

    for raw in reviews:
        result = clean_review(raw)
        if result is None:
            skipped_date += 1
            continue
        if not result["is_substantive"]:
            skipped_empty += 1
            # Still store it (rating is useful), but mark as not substantive
            # It will be stored but skipped for LLM classification
        cleaned.append(result)

    logger.info(
        f"Cleaning: {len(reviews)} raw → {len(cleaned)} kept "
        f"({skipped_date} outside window, {skipped_empty} empty text)"
    )

    return {
        "cleaned": cleaned,
        "skipped_date": skipped_date,
        "skipped_empty": skipped_empty,
        "total": len(reviews),
    }
