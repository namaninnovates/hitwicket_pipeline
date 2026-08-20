"""
Competitor comparison analysis.
Generates a cross-game comparison matrix from real classified data.
Labels are derived from actual priority scores — not fabricated.
"""

import logging
from collections import defaultdict
from typing import Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import GAMES, CATEGORIES

logger = logging.getLogger(__name__)

# Thresholds for High/Medium/Low labels
# Based on frequency percentage of reviews in that category
HIGH_THRESHOLD = 20.0   # >20% of reviews mention this category
MEDIUM_THRESHOLD = 10.0  # 10–20%
# Below 10% = Low


def _label(frequency_pct: float, count: int = 0) -> str:
    """Convert frequency percentage and count to High/Medium/Low with sample guards."""
    if count < 3:
        return "Low"
    if frequency_pct >= HIGH_THRESHOLD and count >= 5:
        return "High"
    elif frequency_pct >= MEDIUM_THRESHOLD and count >= 3:
        return "Medium"
    else:
        return "Low"


def build_competitor_matrix(classified_reviews: list[dict]) -> dict:
    """
    Build a cross-game comparison matrix.

    Returns:
    {
        'matrix': {
            'Gameplay': {'hitwicket': 'High', 'tennis_clash': 'Medium', 'baseball_clash': 'Low'},
            ...
        },
        'raw': {
            'hitwicket': {'Gameplay': {'count': 45, 'pct': 18.0}, ...},
            ...
        },
        'game_totals': {'hitwicket': 250, ...},
        'data_note': str,
    }
    """
    # Count reviews per game × category
    game_category_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    game_totals: dict[str, int] = defaultdict(int)

    for r in classified_reviews:
        game = r.get("game")
        category = r.get("primary_category")
        if not game or not category:
            continue
        game_category_counts[game][category] += 1
        game_totals[game] += 1

    # Build raw frequency data
    raw: dict[str, dict[str, dict]] = {}
    for game_key, cat_counts in game_category_counts.items():
        total = game_totals[game_key]
        raw[game_key] = {}
        for cat in CATEGORIES:
            count = cat_counts.get(cat, 0)
            pct = (count / total * 100) if total > 0 else 0.0
            raw[game_key][cat] = {
                "count": count,
                "pct": round(pct, 1),
                "label": _label(pct, count=count),
            }

    # Build matrix
    matrix: dict[str, dict[str, str]] = {}
    for cat in CATEGORIES:
        matrix[cat] = {}
        for game_key in GAMES:
            if game_key in raw:
                matrix[cat][game_key] = raw[game_key].get(cat, {}).get("label", "N/A")
            else:
                matrix[cat][game_key] = "N/A (no data)"

    # Data quality note
    notes = []
    for game_key, total in game_totals.items():
        if total < 20:
            name = GAMES.get(game_key, {}).get("name", game_key)
            notes.append(f"⚠️ {name}: only {total} classified reviews — comparison labels unreliable")

    data_note = "; ".join(notes) if notes else "All games have sufficient data for comparison"

    return {
        "matrix": matrix,
        "raw": raw,
        "game_totals": dict(game_totals),
        "data_note": data_note,
    }


def format_competitor_matrix(matrix_data: dict) -> str:
    """Format the competitor matrix as a readable text table."""
    matrix = matrix_data["matrix"]
    game_keys = list(GAMES.keys())
    game_names = [GAMES[k]["name"] for k in game_keys]

    # Header
    col_width = 16
    cat_width = 24

    header = f"{'Category':<{cat_width}}" + "".join(f"{n:<{col_width}}" for n in game_names)
    separator = "─" * (cat_width + col_width * len(game_keys))

    rows = [header, separator]
    for cat in CATEGORIES:
        row = f"{cat:<{cat_width}}"
        for game_key in game_keys:
            label = matrix.get(cat, {}).get(game_key, "N/A")
            row += f"{label:<{col_width}}"
        rows.append(row)

    rows.append(separator)
    rows.append(f"\nNote: {matrix_data['data_note']}")
    rows.append("Labels based on % of classified reviews mentioning each category:")
    rows.append("  High >20% | Medium 10-20% | Low <10%")
    rows.append("  All values derived from actual classified review data — not estimated")

    return "\n".join(rows)


def identify_hitwicket_specific_issues(
    matrix_data: dict,
    hitwicket_priorities: list[dict],
) -> list[dict]:
    """
    Find categories where Hitwicket scores HIGH but competitors score LOW/MEDIUM.
    These are Hitwicket-specific problem areas.
    """
    matrix = matrix_data["matrix"]
    specific = []
    seen_categories = set()

    for item in hitwicket_priorities[:10]:  # Check top 10
        cat = item.get("primary_category")
        if not cat or cat in seen_categories:
            continue
        seen_categories.add(cat)

        hw_label = matrix.get(cat, {}).get("hitwicket", "N/A")
        tc_label = matrix.get(cat, {}).get("tennis_clash", "N/A")
        bc_label = matrix.get(cat, {}).get("baseball_clash", "N/A")

        # Hitwicket-specific: HW is High but competitors are Low or Medium
        if hw_label == "High" and all(l in ["Low", "Medium"] for l in [tc_label, bc_label]):
            specific.append({
                **item,
                "hitwicket_label": hw_label,
                "tennis_clash_label": tc_label,
                "baseball_clash_label": bc_label,
                "specificity": "hitwicket_specific",
            })
        elif hw_label == "High" and (tc_label == "High" or bc_label == "High"):
            specific.append({
                **item,
                "hitwicket_label": hw_label,
                "tennis_clash_label": tc_label,
                "baseball_clash_label": bc_label,
                "specificity": "industry_wide",
            })

    return specific
