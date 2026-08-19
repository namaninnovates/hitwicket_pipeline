"""
Founder brief generator.
Uses LLM (or template fallback) to produce a 90-second decision-ready brief.
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import PROMPTS_DIR, GAMES, CATEGORIES, TOP_N_ISSUES
from src.scoring.priority import format_priority_for_display
from src.analysis.competitor import format_competitor_matrix

logger = logging.getLogger(__name__)

BRIEF_PROMPT_PATH = PROMPTS_DIR / "founder_brief.txt"


def _get_brief_prompt_template() -> str:
    return BRIEF_PROMPT_PATH.read_text(encoding="utf-8")


def _format_priority_text(priorities: list[dict], top_n: int = TOP_N_ISSUES) -> str:
    """Format top N priority issues for insertion into prompt."""
    lines = []
    for i, p in enumerate(priorities[:top_n], 1):
        lines.append(
            f"{i}. [{p['priority_int']}/100] {p['primary_category']} / {p['subcategory']}\n"
            f"   Frequency: {p['frequency_pct']:.1f}% | "
            f"Severity: {p['avg_severity']:.1f}/5 | "
            f"Business Impact: {p['avg_business_impact']:.1f}/5 | "
            f"Trend: {p['trend_label']}"
        )
        if p.get("sample_note"):
            lines.append(f"   {p['sample_note']}")
    return "\n".join(lines)


def _format_trend_text(priorities: list[dict]) -> str:
    """Summarize notable trends for the prompt."""
    rising = [p for p in priorities if "rising" in p.get("trend_label", "")]
    declining = [p for p in priorities if "declining" in p.get("trend_label", "")]

    lines = []
    if rising:
        lines.append("Rising issues (last 30d vs prior 30d):")
        for p in rising[:3]:
            lines.append(f"  - {p['primary_category']} / {p['subcategory']}: {p['trend_label']}")
    if declining:
        lines.append("Declining issues:")
        for p in declining[:2]:
            lines.append(f"  - {p['primary_category']} / {p['subcategory']}: {p['trend_label']}")
    if not lines:
        lines.append("Insufficient data for reliable trend comparison (first run or <60 days of data)")
    return "\n".join(lines)


def _format_competitor_context(matrix_data: dict, hitwicket_priorities: list[dict]) -> str:
    """Format competitor context for prompt."""
    from src.analysis.competitor import identify_hitwicket_specific_issues
    specific = identify_hitwicket_specific_issues(matrix_data, hitwicket_priorities)

    lines = []
    if specific:
        hw_specific = [s for s in specific if s.get("specificity") == "hitwicket_specific"]
        industry_wide = [s for s in specific if s.get("specificity") == "industry_wide"]

        if hw_specific:
            lines.append("Hitwicket-SPECIFIC problems (not seen at same level in competitors):")
            for s in hw_specific[:3]:
                lines.append(
                    f"  - {s['primary_category']}: HW=High, TennisCl={s['tennis_clash_label']}, BaseballCl={s['baseball_clash_label']}"
                )
        if industry_wide:
            lines.append("Industry-wide problems (also high in competitors):")
            for s in industry_wide[:2]:
                lines.append(
                    f"  - {s['primary_category']}: HW=High, TennisCl={s['tennis_clash_label']}, BaseballCl={s['baseball_clash_label']}"
                )
    else:
        lines.append("Insufficient data to identify Hitwicket-specific vs industry-wide issues.")

    lines.append("\n" + format_competitor_matrix(matrix_data))
    return "\n".join(lines)


def _generate_with_llm(
    game_key: str,
    game_name: str,
    review_count: int,
    analysis_date: str,
    priority_text: str,
    trend_text: str,
    competitor_context: str,
) -> Optional[str]:
    """Try to generate brief with Gemini. Returns None if unavailable."""
    from src.config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_FALLBACK_MODEL

    if not GEMINI_API_KEY:
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)

        template = _get_brief_prompt_template()
        prompt = template.format(
            game_name=game_name,
            analysis_date=analysis_date,
            review_count=review_count,
            priority_issues_text=priority_text,
            trend_text=trend_text,
            competitor_context=competitor_context,
        )

        for model_name in [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                return response.text
            except Exception as e:
                logger.warning(f"Brief generation with {model_name} failed: {e}")
                continue

    except Exception as e:
        logger.error(f"LLM brief generation failed: {e}")

    return None


def _generate_template_brief(
    game_name: str,
    review_count: int,
    analysis_date: str,
    priorities: list[dict],
    trend_text: str,
    competitor_context: str,
) -> str:
    """
    Template-based brief fallback (no LLM required).
    Produces a structured brief from data alone.
    """
    top = priorities[0] if priorities else None
    second = priorities[1] if len(priorities) > 1 else None

    brief_lines = [
        f"# Weekly Review Brief — {game_name}",
        f"**{analysis_date}** | {review_count} reviews analyzed (Google Play, last 90 days)",
        "",
        "## ⚡ Biggest Emerging Problem",
    ]

    if top:
        brief_lines.append(
            f"**{top['primary_category']} / {top['subcategory']}** is the highest-priority issue "
            f"(Priority: {top['priority_int']}/100). It appears in {top['frequency_pct']:.1f}% of reviews "
            f"with an average severity of {top['avg_severity']:.1f}/5. "
            f"Average business impact score: {top['avg_business_impact']:.1f}/5."
        )
        if top.get("sample_note"):
            brief_lines.append(f"*{top['sample_note']}*")
    else:
        brief_lines.append("Insufficient classified data to identify top issue.")

    brief_lines += [
        "",
        "## 🕐 Why Now?",
        trend_text,
        "",
        "## 🌍 Competitive Signal",
        competitor_context,
        "",
        "## ✅ Recommendation",
    ]

    if top:
        cat = top.get("primary_category", "")
        if cat == "Monetization":
            brief_lines.append(
                f"Review pricing and pay-to-win balance in {game_name}. "
                "Consider offering a non-paid competitive path. "
                "Audit the most complained-about IAPs and reduce friction."
            )
        elif cat == "Progression":
            brief_lines.append(
                f"Audit the reward cadence in the first 7 days of play. "
                "Increase mid-game reward frequency without inflating early rewards. "
                "Consider a catch-up mechanic for players who feel stuck."
            )
        elif cat == "Gameplay":
            brief_lines.append(
                "Run a balance review specifically targeting the most common complaint subcategory. "
                "A/B test adjustments with a small cohort before rolling out widely."
            )
        elif cat == "Experience":
            brief_lines.append(
                "Prioritize crash and lag fixes in the next release sprint. "
                "Set up crash reporting alerting if not already in place."
            )
        elif cat == "Competition & Social":
            brief_lines.append(
                "Review matchmaking algorithm, especially for mid-tier players. "
                "Poor matchmaking at this stage creates a bottleneck that accelerates churn."
            )
        else:
            brief_lines.append("Investigate the top priority issue and assign a product owner.")

    brief_lines += [
        "",
        "## 📈 Expected Impact",
    ]

    if top:
        cat = top.get("primary_category", "")
        if cat in ["Monetization", "Progression"]:
            brief_lines.append(
                "Fixing progression/monetization friction typically improves 30-day retention by 5–15% "
                "and can increase conversion rate on in-app purchases by 10–20%."
            )
        elif cat == "Experience":
            brief_lines.append(
                "Resolving crash/performance issues typically improves store rating by 0.2–0.5 stars "
                "within 30 days and reduces uninstall rate meaningfully."
            )
        else:
            brief_lines.append(
                "Addressing the top issue is expected to improve player satisfaction score "
                "and reduce negative review velocity."
            )

    brief_lines += [
        "",
        "## ❌ What NOT to Do",
    ]

    if second:
        # Find lowest priority issue
        last = priorities[-1] if len(priorities) > 1 else None
        if last and last["priority_int"] < 25:
            brief_lines.append(
                f"Do not prioritize {last['primary_category']} / {last['subcategory']} — "
                f"it has a priority score of only {last['priority_int']}/100 and appears in "
                f"only {last['frequency_pct']:.1f}% of reviews."
            )
        else:
            brief_lines.append(
                "Do not spread resources across all categories simultaneously. "
                f"Focus on the top 2 issues ({priorities[0]['primary_category']}, "
                f"{priorities[1]['primary_category']}) before addressing lower-priority signals."
            )
    else:
        brief_lines.append(
            "Do not invest in visual polish or new features until core product issues are resolved."
        )

    brief_lines += [
        "",
        "---",
        f"*Generated: {analysis_date} | Source: Google Play (Android only)*",
        f"*Data limitation: Apple App Store reviews not included (scraper unavailable)*",
    ]

    return "\n".join(brief_lines)


def generate_founder_brief(
    game_key: str,
    classified_reviews: list[dict],
    priority_scores: list[dict],
    matrix_data: dict,
    output_dir: Path,
) -> Path:
    """
    Generate and save the founder brief for a game.
    Returns the path to the saved brief.
    """
    game_name = GAMES.get(game_key, {}).get("name", game_key)
    analysis_date = datetime.now().strftime("%Y-%m-%d")
    review_count = len([r for r in classified_reviews if r.get("game") == game_key])

    # Format data for brief
    priority_text = _format_priority_text(priority_scores)
    trend_text = _format_trend_text(priority_scores)
    competitor_context = _format_competitor_context(matrix_data, priority_scores)

    # Try LLM first
    brief_content = _generate_with_llm(
        game_key=game_key,
        game_name=game_name,
        review_count=review_count,
        analysis_date=analysis_date,
        priority_text=priority_text,
        trend_text=trend_text,
        competitor_context=competitor_context,
    )

    if not brief_content:
        logger.info(f"Using template-based brief for {game_name}")
        brief_content = _generate_template_brief(
            game_name=game_name,
            review_count=review_count,
            analysis_date=analysis_date,
            priorities=priority_scores,
            trend_text=trend_text,
            competitor_context=competitor_context,
        )
    else:
        # Append data note to LLM-generated brief
        brief_content += (
            f"\n\n---\n"
            f"*Generated: {analysis_date} | Model: Gemini | Source: Google Play (Android only)*\n"
            f"*Data limitation: Apple App Store reviews not included*"
        )

    # Save
    output_dir.mkdir(parents=True, exist_ok=True)
    brief_path = output_dir / f"founder_brief_{game_key}.md"
    brief_path.write_text(brief_content, encoding="utf-8")
    logger.info(f"Founder brief saved: {brief_path}")

    return brief_path
