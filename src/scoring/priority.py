"""
Priority scoring module.
Implements the explicit formula from SCORING.md:

    Priority = 0.30 × Frequency + 0.25 × Severity + 0.25 × BusinessImpact + 0.20 × Trend

All components normalized to 0–100 before weighting.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import (
    SCORE_WEIGHT_FREQUENCY,
    SCORE_WEIGHT_SEVERITY,
    SCORE_WEIGHT_BUSINESS_IMPACT,
    SCORE_WEIGHT_TREND,
    TREND_WINDOW_DAYS,
    MIN_TREND_SAMPLE,
)

logger = logging.getLogger(__name__)


def _normalize_severity(avg: float) -> float:
    """Map average severity (1–5) to 0–100."""
    return ((avg - 1) / 4) * 100


def _normalize_business_impact(avg: float) -> float:
    """Map average business_impact (1–5) to 0–100."""
    return ((avg - 1) / 4) * 100


def _normalize_trend(pct_change: float) -> float:
    """
    Map percent change to 0–100.
    -100% → 0 (issue completely gone)
      0%  → 33 (stable)
    +100% → 67 (doubled)
    +200% → 100 (tripled — critical escalation)
    """
    clamped = max(-100.0, min(200.0, pct_change))
    return (clamped + 100) / 3


def _compute_trend(
    current_count: int,
    prior_count: int,
) -> tuple[float, str]:
    """
    Compute trend normalized score.
    Returns (normalized_score, status_label).
    """
    if current_count < MIN_TREND_SAMPLE or prior_count < MIN_TREND_SAMPLE:
        return 50.0, "insufficient_sample"

    if prior_count == 0:
        return 100.0, "+∞% (new issue)"

    pct_change = ((current_count - prior_count) / prior_count) * 100
    score = _normalize_trend(pct_change)

    if pct_change > 20:
        label = f"+{pct_change:.0f}% (rising)"
    elif pct_change < -20:
        label = f"{pct_change:.0f}% (declining)"
    else:
        label = f"{pct_change:+.0f}% (stable)"

    return score, label


def split_by_period(
    reviews: list[dict],
    window_days: int = TREND_WINDOW_DAYS,
) -> tuple[list[dict], list[dict]]:
    """
    Split reviews into current period and prior period.
    Current: last 30 days
    Prior: 31–60 days ago
    """
    now = datetime.now(timezone.utc)
    current_cutoff = now - timedelta(days=window_days)
    prior_cutoff = now - timedelta(days=window_days * 2)

    current = []
    prior = []

    for r in reviews:
        date_str = r.get("review_date")
        if not date_str:
            continue
        try:
            dt = datetime.fromisoformat(date_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)

            if dt >= current_cutoff:
                current.append(r)
            elif dt >= prior_cutoff:
                prior.append(r)
        except (ValueError, TypeError):
            continue

    return current, prior


def compute_priority_scores(
    classified_reviews: list[dict],
    game: Optional[str] = None,
) -> list[dict]:
    """
    Compute priority scores for all category combinations.

    Input: list of classified review dicts (from DB join query)
    Output: list of priority score dicts, sorted by priority descending

    Each output dict:
    {
        'game': str,
        'primary_category': str,
        'subcategory': str,
        'review_count': int,
        'total_game_reviews': int,
        'frequency_pct': float,
        'frequency_score': float,
        'avg_severity': float,
        'severity_score': float,
        'avg_business_impact': float,
        'business_impact_score': float,
        'current_count': int,
        'prior_count': int,
        'trend_label': str,
        'trend_score': float,
        'priority_score': float,
        'priority_int': int,
        'avg_rating': float,
        'neg_sentiment_pct': float,
        'sample_note': str,
    }
    """
    if game:
        reviews = [r for r in classified_reviews if r.get("game") == game]
    else:
        reviews = classified_reviews

    if not reviews:
        logger.warning("No reviews to score")
        return []

    # Split into periods for trend analysis
    current_reviews, prior_reviews = split_by_period(reviews)

    # Group by (game, primary_category, subcategory)
    groups: dict[tuple, list[dict]] = defaultdict(list)
    current_groups: dict[tuple, int] = defaultdict(int)
    prior_groups: dict[tuple, int] = defaultdict(int)

    game_totals: dict[str, int] = defaultdict(int)

    for r in reviews:
        key = (r.get("game"), r.get("primary_category"), r.get("subcategory"))
        groups[key].append(r)

    for r in current_reviews:
        key = (r.get("game"), r.get("primary_category"), r.get("subcategory"))
        current_groups[key] += 1

    for r in prior_reviews:
        key = (r.get("game"), r.get("primary_category"), r.get("subcategory"))
        prior_groups[key] += 1

    # Total per game
    for r in reviews:
        game_totals[r.get("game")] += 1

    results = []

    for key, group_reviews in groups.items():
        game_key, primary_category, subcategory = key

        if not primary_category:
            continue  # Skip unclassified

        total_game = game_totals[game_key]
        count = len(group_reviews)

        # Frequency
        freq_pct = (count / total_game * 100) if total_game > 0 else 0
        freq_score = freq_pct  # Already 0–100 since percentages

        # Severity
        severities = [r.get("severity") for r in group_reviews if r.get("severity")]
        avg_severity = sum(severities) / len(severities) if severities else 3.0
        severity_score = _normalize_severity(avg_severity)

        # Business Impact
        impacts = [r.get("business_impact") for r in group_reviews if r.get("business_impact")]
        avg_impact = sum(impacts) / len(impacts) if impacts else 3.0
        impact_score = _normalize_business_impact(avg_impact)

        # Trend
        current_count = current_groups.get(key, 0)
        prior_count = prior_groups.get(key, 0)
        trend_score, trend_label = _compute_trend(current_count, prior_count)

        # Statistical confidence dampener to eliminate single-review bias
        # For small sample sizes (count < 5), scale score by min(1.0, count / 5.0)
        # and do not grant unearned neutral trend points
        confidence_factor = min(1.0, count / 5.0)
        effective_trend_score = trend_score if count >= 5 else 0.0

        # Composite priority score
        raw_priority = (
            SCORE_WEIGHT_FREQUENCY * freq_score
            + SCORE_WEIGHT_SEVERITY * severity_score
            + SCORE_WEIGHT_BUSINESS_IMPACT * impact_score
            + SCORE_WEIGHT_TREND * effective_trend_score
        )
        priority = raw_priority * confidence_factor

        # Auxiliary stats
        ratings = [r.get("rating") for r in group_reviews if r.get("rating")]
        avg_rating = sum(ratings) / len(ratings) if ratings else None

        sentiments = [r.get("sentiment") for r in group_reviews]
        neg_count = sum(1 for s in sentiments if s == "negative")
        neg_pct = (neg_count / count * 100) if count > 0 else 0

        # Sample quality note
        if count < 5:
            sample_note = f"⚠️ Small sample ({count} reviews) — treat with caution"
        elif count < 15:
            sample_note = f"Note: Moderate sample ({count} reviews)"
        else:
            sample_note = ""

        results.append({
            "game": game_key,
            "primary_category": primary_category,
            "subcategory": subcategory or primary_category,
            "review_count": count,
            "total_game_reviews": total_game,
            "frequency_pct": round(freq_pct, 1),
            "frequency_score": round(freq_score, 1),
            "avg_severity": round(avg_severity, 2),
            "severity_score": round(severity_score, 1),
            "avg_business_impact": round(avg_impact, 2),
            "business_impact_score": round(impact_score, 1),
            "current_count": current_count,
            "prior_count": prior_count,
            "trend_label": trend_label,
            "trend_score": round(trend_score, 1),
            "priority_score": round(priority, 2),
            "priority_int": int(round(priority)),
            "avg_rating": round(avg_rating, 2) if avg_rating else None,
            "neg_sentiment_pct": round(neg_pct, 1),
            "sample_note": sample_note,
        })

    # Sort by priority descending
    results.sort(key=lambda x: x["priority_score"], reverse=True)

    logger.info(f"Priority scoring complete: {len(results)} category/game combinations")
    return results


def compute_all_games_priority(classified_reviews: list[dict]) -> dict[str, list[dict]]:
    """
    Compute priority scores per game.
    Returns dict of game_key → sorted priority scores.
    """
    games = list(set(r.get("game") for r in classified_reviews if r.get("game")))
    result = {}
    for game in games:
        result[game] = compute_priority_scores(classified_reviews, game=game)
    return result


def format_priority_for_display(score: dict) -> str:
    """Format a single priority score for human-readable display."""
    lines = [
        f"{score['primary_category']} / {score['subcategory']}",
        "─" * 45,
        f"Frequency:       {score['frequency_pct']:.1f}% of reviews     → {score['frequency_score']:.1f} / 100",
        f"Severity:        {score['avg_severity']:.1f} / 5              → {score['severity_score']:.1f} / 100",
        f"Business Impact: {score['avg_business_impact']:.1f} / 5             → {score['business_impact_score']:.1f} / 100",
        f"Trend:           {score['trend_label']:<20}   → {score['trend_score']:.1f} / 100",
        "─" * 45,
        f"Priority Score:  {score['priority_int']} / 100",
    ]
    if score.get("sample_note"):
        lines.append(score["sample_note"])
    return "\n".join(lines)
