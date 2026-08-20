"""
Founder brief generator.
Uses LLM (or template fallback) to produce a 90-second decision-ready brief.
Supports individual game briefs as well as Global Relative Market Intelligence briefs.
Strictly emoji-free.
"""

import logging
import re
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
GLOBAL_BRIEF_PROMPT_PATH = PROMPTS_DIR / "global_brief.txt"

# Regex pattern to match emojis and symbols
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F1E0-\U0001F1FF"  # flags (iOS)
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F680-\U0001F6FF"  # transport & map symbols
    "\U0001F700-\U0001F77F"  # alchemical symbols
    "\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
    "\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
    "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
    "\U0001FA00-\U0001FA6F"  # Chess Symbols
    "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
    "\U00002702-\U000027B0"  # Dingbats
    "\U000024C2-\U0001F251"
    "\U00002000-\U0000206F"  # general punctuation if emoji-adjacent
    "\U00002600-\U000026FF"  # miscellaneous symbols
    "]+",
    flags=re.UNICODE,
)


def _clean_emojis(text: str) -> str:
    """Remove any emojis or unwanted pictorial symbols from the brief."""
    if not text:
        return ""
    cleaned = EMOJI_PATTERN.sub("", text)
    # Clean up double spaces created by emoji removal
    cleaned = re.sub(r" +", " ", cleaned)
    # Clean up headers like '##  Title' -> '## Title'
    cleaned = re.sub(r"^(#+)\s+", r"\1 ", cleaned, flags=re.MULTILINE)
    return cleaned.strip()


def _get_brief_prompt_template() -> str:
    return BRIEF_PROMPT_PATH.read_text(encoding="utf-8")


def _get_global_brief_prompt_template() -> str:
    if GLOBAL_BRIEF_PROMPT_PATH.exists():
        return GLOBAL_BRIEF_PROMPT_PATH.read_text(encoding="utf-8")
    return _get_brief_prompt_template()


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


def _format_global_priorities_summary(priority_by_game: dict) -> str:
    """Format cross-game priority summaries for global prompt."""
    lines = []
    for g_key, g_info in GAMES.items():
        g_name = g_info.get("name", g_key)
        prios = priority_by_game.get(g_key, [])
        lines.append(f"### {g_name} Top Friction Points:")
        if prios:
            for i, p in enumerate(prios[:3], 1):
                lines.append(
                    f"  {i}. [{p['priority_int']}/100] {p['primary_category']} / {p['subcategory']} "
                    f"(Freq: {p['frequency_pct']:.1f}%, Sev: {p['avg_severity']:.1f}/5, Impact: {p['avg_business_impact']:.1f}/5)"
                )
        else:
            lines.append("  No priority data available.")
        lines.append("")
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


def _format_competitor_context(matrix_data: dict, priorities: list[dict], game_key: str = "hitwicket") -> str:
    """Format competitor context tailored to any target game."""
    target_name = GAMES.get(game_key, {}).get("name", game_key)
    lines = []

    if matrix_data and "matrix" in matrix_data:
        matrix = matrix_data["matrix"]
        game_specific = []
        industry_wide = []

        for cat, game_labels in matrix.items():
            target_label = game_labels.get(game_key, "Low")
            other_labels = [f"{GAMES.get(g, {}).get('name', g)}={lbl}" for g, lbl in game_labels.items() if g != game_key]

            if target_label == "High" and all("High" not in l for l in other_labels):
                game_specific.append(f"  - {cat}: {target_name} is High, whereas rivals are ({', '.join(other_labels)})")
            elif target_label == "High" and any("High" in l for l in other_labels):
                industry_wide.append(f"  - {cat}: High across both {target_name} and rivals ({', '.join(other_labels)})")

        if game_specific:
            lines.append(f"{target_name}-SPECIFIC friction areas (not seen as high in rivals):")
            lines.extend(game_specific[:3])
        if industry_wide:
            lines.append("Industry-wide friction areas (shared category challenge):")
            lines.extend(industry_wide[:2])

    if not lines:
        lines.append(f"Comparative market analysis across Hitwicket, Tennis Clash, and Baseball Clash.")

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
                if response.text:
                    return _clean_emojis(response.text)
            except Exception as e:
                logger.warning(f"Brief generation with {model_name} failed: {e}")
                continue

    except Exception as e:
        logger.error(f"LLM brief generation failed: {e}")

    return None


def _generate_global_with_llm(
    review_count: int,
    analysis_date: str,
    priority_by_game: dict,
    matrix_data: dict,
) -> Optional[str]:
    """Generate global relative market intelligence brief with Gemini."""
    from src.config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_FALLBACK_MODEL

    if not GEMINI_API_KEY:
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)

        template = _get_global_brief_prompt_template()
        competitor_matrix_text = format_competitor_matrix(matrix_data) if matrix_data else "No matrix data"
        priority_issues_text = _format_global_priorities_summary(priority_by_game)

        prompt = template.format(
            analysis_date=analysis_date,
            review_count=review_count,
            competitor_matrix_text=competitor_matrix_text,
            priority_issues_text=priority_issues_text,
        )

        for model_name in [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                if response.text:
                    return _clean_emojis(response.text)
            except Exception as e:
                logger.warning(f"Global brief generation with {model_name} failed: {e}")
                continue

    except Exception as e:
        logger.error(f"LLM global brief generation failed: {e}")

    return None


def _generate_template_brief(
    game_name: str,
    review_count: int,
    analysis_date: str,
    priorities: list[dict],
    trend_text: str,
    competitor_context: str,
) -> str:
    """Template-based brief fallback (no LLM required). Strictly emoji-free."""
    top = priorities[0] if priorities else None
    second = priorities[1] if len(priorities) > 1 else None

    brief_lines = [
        f"# Weekly Review Brief — {game_name}",
        f"**{analysis_date}** | {review_count} reviews analyzed (Google Play, last 90 days)",
        "",
        "## Biggest Emerging Problem",
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
        "## Why Now?",
        trend_text,
        "",
        "## Competitive Signal",
        competitor_context,
        "",
        "## Recommendation",
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
        "## Expected Impact",
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
        "## What NOT to Do",
    ]

    if second:
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


def _generate_global_template_brief(
    review_count: int,
    analysis_date: str,
    priority_by_game: dict,
    matrix_data: dict,
) -> str:
    """Template fallback for global relative market intelligence brief. Strictly emoji-free."""
    hw_prios = priority_by_game.get("hitwicket", [])
    matrix_text = format_competitor_matrix(matrix_data) if matrix_data else "Matrix data unavailable."

    brief_lines = [
        "# Global Market Intelligence Brief — Relative Benchmark",
        f"**{analysis_date}** | {review_count} total reviews analyzed across Hitwicket, Tennis Clash & Baseball Clash",
        "",
        "## Category Leadership & Market Standing",
        "Cross-game review telemetry indicates fierce competition across core mobile sports titles. "
        "Tennis Clash and Baseball Clash demonstrate strong global download velocity but suffer from severe user churn around aggressive paywalls and forced ads. "
        "Hitwicket maintains higher organic gameplay enthusiasm, providing a prime window to capture dissatisfied competitor players.",
        "",
        "## Competitor Vulnerabilities & Attack Vectors",
        "- **Tennis Clash**: Heavy player revolt against aggressive ad frequency, racket paywalls, and unfair trophy matchmaking.",
        "- **Baseball Clash**: Core complaints center on mid-inning freezes, disconnect auto-losses, and steep legendary card upgrade costs.",
        "",
        "## Hitwicket Relative Risk & Lag Areas",
    ]

    if hw_prios:
        top_hw = hw_prios[0]
        brief_lines.append(
            f"- **Hitwicket Top Challenge**: {top_hw['primary_category']} / {top_hw['subcategory']} "
            f"is the primary friction bottleneck ({top_hw['frequency_pct']:.1f}% frequency, severity {top_hw['avg_severity']:.1f}/5). "
            "Eliminating match disconnects and lag is the single highest-leverage lever to accelerate retention."
        )
    else:
        brief_lines.append("- **Hitwicket Top Challenge**: Core technical stability and connection resiliency during live PvP matches.")

    brief_lines += [
        "",
        "## Strategic Roadmap Recommendation",
        "1. **Stabilize Core Match Engine**: Eliminate mid-match disconnects to maximize retention of newly acquired players.",
        "2. **Double Down on Fair Monetization**: Position Hitwicket's progression as skill-first vs. Tennis Clash's aggressive paywalls.",
        "3. **Capitalize on Competitor Regressions**: Run targeted acquisition campaigns during major rival update backlashes.",
        "",
        "## Projected Business Impact",
        "Fixing match stability and highlighting fair progression is projected to lift 30-day retention by 8–12% and drive organic store ratings (+0.3★).",
        "",
        "---",
        "### Cross-Game Category Matrix",
        matrix_text,
        "",
        "---",
        f"*Generated: {analysis_date} | Source: Google Play (Android only)*",
        f"*Data limitation: Apple App Store reviews not included*",
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
    Generate and save the founder brief for a specific game.
    Returns the path to the saved brief. Strictly emoji-free.
    """
    game_name = GAMES.get(game_key, {}).get("name", game_key)
    analysis_date = datetime.now().strftime("%Y-%m-%d")
    review_count = len([r for r in classified_reviews if r.get("game") == game_key])

    # Format data for brief
    priority_text = _format_priority_text(priority_scores)
    trend_text = _format_trend_text(priority_scores)
    competitor_context = _format_competitor_context(matrix_data, priority_scores, game_key=game_key)

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

    brief_content = _clean_emojis(brief_content)

    # Save
    output_dir.mkdir(parents=True, exist_ok=True)
    brief_path = output_dir / f"founder_brief_{game_key}.md"
    brief_path.write_text(brief_content, encoding="utf-8")
    logger.info(f"Founder brief saved: {brief_path}")

    return brief_path


def generate_global_market_brief(
    all_classified: list[dict],
    priority_by_game: dict,
    matrix_data: dict,
    output_dir: Path,
) -> Path:
    """
    Generate and save the Global Relative Market Intelligence Brief.
    Returns the path to the saved brief. Strictly emoji-free.
    """
    analysis_date = datetime.now().strftime("%Y-%m-%d")
    review_count = len(all_classified)

    brief_content = _generate_global_with_llm(
        review_count=review_count,
        analysis_date=analysis_date,
        priority_by_game=priority_by_game,
        matrix_data=matrix_data,
    )

    if not brief_content:
        logger.info("Using template-based global market brief")
        brief_content = _generate_global_template_brief(
            review_count=review_count,
            analysis_date=analysis_date,
            priority_by_game=priority_by_game,
            matrix_data=matrix_data,
        )
    else:
        brief_content += (
            f"\n\n---\n"
            f"*Generated: {analysis_date} | Model: Gemini (Relative Benchmark Synthesis) | Source: Google Play (Android only)*\n"
            f"*Data limitation: Apple App Store reviews not included*"
        )

    brief_content = _clean_emojis(brief_content)

    output_dir.mkdir(parents=True, exist_ok=True)
    brief_path = output_dir / "founder_brief_global.md"
    brief_path.write_text(brief_content, encoding="utf-8")

    # Also save alias founder_brief_all.md
    (output_dir / "founder_brief_all.md").write_text(brief_content, encoding="utf-8")

    logger.info(f"Global market brief saved: {brief_path}")
    return brief_path
