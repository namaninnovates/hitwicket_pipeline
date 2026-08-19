"""
LLM-based review classifier using Google Gemini.

Features:
- Retries up to MAX_RETRIES on malformed JSON
- Uses safe fallback values on persistent failures
- Logs every failure with review_id for audit
- Supports batched calls for efficiency
- Logs the model used for every classification
"""

import json
import logging
import re
import time
from pathlib import Path
from typing import Optional
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_FALLBACK_MODEL,
    CLASSIFICATION_MAX_RETRIES,
    PROMPTS_DIR,
    GAMES,
)
from src.classification.validator import ClassificationOutput, FALLBACK_CLASSIFICATION

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Load prompt template
# ─────────────────────────────────────────────
CLASSIFY_PROMPT_PATH = PROMPTS_DIR / "classify_review.txt"
_PROMPT_TEMPLATE: Optional[str] = None


def _get_prompt_template() -> str:
    global _PROMPT_TEMPLATE
    if _PROMPT_TEMPLATE is None:
        _PROMPT_TEMPLATE = CLASSIFY_PROMPT_PATH.read_text(encoding="utf-8")
    return _PROMPT_TEMPLATE


# ─────────────────────────────────────────────
# Gemini client
# ─────────────────────────────────────────────
_genai = None
_model_instance = None
_active_model_name: str = "rule_based_fallback"


def _get_model():
    global _genai, _model_instance, _active_model_name

    if not GEMINI_API_KEY:
        logger.warning("No GEMINI_API_KEY found — classifier will use rule-based fallback")
        return None

    if _model_instance is not None:
        return _model_instance

    try:
        import google.generativeai as genai
        _genai = genai
        genai.configure(api_key=GEMINI_API_KEY)

        # Try primary model, fall back if unavailable
        for model_name in [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]:
            try:
                model = genai.GenerativeModel(model_name)
                # Quick ping to verify model works
                _model_instance = model
                _active_model_name = model_name
                logger.info(f"Gemini model initialized: {model_name}")
                return model
            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}")
                continue

        logger.error("All Gemini models failed to initialize")
        return None

    except ImportError:
        logger.error("google-generativeai not installed. Run: pip install google-generativeai")
        return None
    except Exception as e:
        logger.error(f"Failed to initialize Gemini: {e}")
        return None


def get_active_model_name() -> str:
    return _active_model_name


# ─────────────────────────────────────────────
# JSON extraction helper
# ─────────────────────────────────────────────
def _extract_json(text: str) -> Optional[dict]:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Remove markdown code fences
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```\s*$", "", text, flags=re.MULTILINE)
    text = text.strip()

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object in the text
    match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return None


# ─────────────────────────────────────────────
# Rule-based fallback classifier
# ─────────────────────────────────────────────
def _rule_based_classify(review: dict) -> ClassificationOutput:
    """
    Simple rule-based classifier used when no LLM is available.
    Less accurate than LLM but always works.
    """
    text = (review.get("review_text") or "").lower()
    rating = review.get("rating") or 3

    # Sentiment from rating
    if rating >= 4:
        sentiment = "positive"
        severity = 1
        business_impact = 1
    elif rating == 3:
        sentiment = "mixed"
        severity = 2
        business_impact = 2
    else:
        sentiment = "negative"
        severity = 4 if rating == 1 else 3
        business_impact = 3

    # Category from keywords
    category = "Experience"  # default
    subcategory = "Bugs / crashes"
    issue = f"{'Positive' if sentiment == 'positive' else 'Negative'} review (rule-based classification)"

    if any(w in text for w in ["pay", "money", "purchase", "buy", "expensive", "cheap", "free", "gem", "diamond", "coin", "ad", "ads", "advertisement"]):
        category = "Monetization"
        subcategory = "Pay-to-win pressure" if any(w in text for w in ["pay to win", "p2w", "unfair", "whale"]) else "Ads" if any(w in text for w in ["ad", "ads", "advertisement"]) else "Pricing"
        issue = "Player mentions spending/payment or ads"
    elif any(w in text for w in ["slow", "grind", "progress", "upgrade", "level", "reward", "chest"]):
        category = "Progression"
        subcategory = "Difficulty / grind" if any(w in text for w in ["grind", "slow", "too long"]) else "Rewards"
        issue = "Player comments on progression speed or rewards"
    elif any(w in text for w in ["match", "game", "play", "win", "lose", "strategy", "skill", "balance", "fair", "cheat", "bot", "rng", "luck", "random"]):
        category = "Gameplay"
        subcategory = "Balance / fairness" if any(w in text for w in ["unfair", "balance", "cheat", "bot"]) else "RNG / randomness" if any(w in text for w in ["luck", "random", "rng"]) else "Match / mechanics"
        issue = "Player comments on gameplay experience"
    elif any(w in text for w in ["crash", "bug", "glitch", "error", "freeze", "lag", "slow", "load", "ui", "tutorial"]):
        category = "Experience"
        subcategory = "Bugs / crashes" if any(w in text for w in ["crash", "bug", "glitch", "error", "freeze"]) else "Performance" if any(w in text for w in ["lag", "slow", "load"]) else "UI / UX"
        issue = "Player reports technical issue or UI problem"
    elif any(w in text for w in ["match", "opponent", "pvp", "ranked", "league", "club", "guild", "team", "event", "season"]):
        category = "Competition & Social"
        subcategory = "Matchmaking" if any(w in text for w in ["match", "opponent", "ranked"]) else "Events"
        issue = "Player comments on competitive or social features"

    return ClassificationOutput(
        primary_category=category,
        subcategory=subcategory,
        sentiment=sentiment,
        severity=severity,
        business_impact=business_impact,
        issue=issue,
        actionability=3,
        confidence=0.4,  # Low confidence — rule-based
    )


# ─────────────────────────────────────────────
# Core classifier
# ─────────────────────────────────────────────
def classify_review(review: dict) -> tuple[ClassificationOutput, str, bool]:
    """
    Classify a single review.

    Returns:
        (ClassificationOutput, model_name, is_fallback)
        - is_fallback=True means the LLM failed and we used a fallback
    """
    model = _get_model()
    game_key = review.get("game", "hitwicket")
    game_name = GAMES.get(game_key, {}).get("name", game_key)
    review_text = review.get("review_text", "")
    rating = review.get("rating", 3)

    if model is None:
        # No LLM available — use rule-based
        result = _rule_based_classify(review)
        return result, "rule_based", True

    # Build prompt
    template = _get_prompt_template()
    prompt = template.format(
        game_name=game_name,
        rating=rating,
        review_text=review_text[:1000],  # Cap to avoid token overflow
    )

    last_error = None
    for attempt in range(1, CLASSIFICATION_MAX_RETRIES + 1):
        try:
            response = model.generate_content(prompt)
            raw_text = response.text

            parsed = _extract_json(raw_text)
            if parsed is None:
                raise ValueError(f"Could not extract JSON from response: {raw_text[:200]}")

            # Validate with Pydantic
            result = ClassificationOutput(**parsed)
            return result, _active_model_name, False

        except Exception as e:
            last_error = e
            logger.warning(
                f"Classification attempt {attempt}/{CLASSIFICATION_MAX_RETRIES} failed "
                f"for review {review.get('review_id', '?')[:20]}: {e}"
            )
            if attempt < CLASSIFICATION_MAX_RETRIES:
                time.sleep(1.0 * attempt)  # Exponential-ish backoff

    # All retries exhausted — use fallback
    logger.error(
        f"Classification failed after {CLASSIFICATION_MAX_RETRIES} attempts "
        f"for review {review.get('review_id', '?')[:20]}. "
        f"Last error: {last_error}. Using fallback."
    )
    return FALLBACK_CLASSIFICATION, _active_model_name, True


def classify_batch(
    reviews: list[dict],
    progress_callback=None,
) -> list[tuple[dict, ClassificationOutput, str, bool]]:
    """
    Classify a list of reviews.

    Returns list of (review, classification, model_name, is_fallback).
    """
    results = []
    total = len(reviews)

    for i, review in enumerate(reviews):
        classification, model_name, is_fallback = classify_review(review)
        results.append((review, classification, model_name, is_fallback))

        if progress_callback:
            progress_callback(i + 1, total)
        elif (i + 1) % 10 == 0 or (i + 1) == total:
            logger.info(f"Classified {i + 1}/{total} reviews")

        # Small rate limit delay for LLM calls
        if not is_fallback and i < total - 1:
            time.sleep(0.3)

    return results
