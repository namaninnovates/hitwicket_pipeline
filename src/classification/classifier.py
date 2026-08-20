"""
High-speed deterministic rule-based NLP review classifier.
Classifies reviews across the 5 primary taxonomy categories and subcategories
without calling external LLM APIs (0 cost, instant execution).

Gemini LLM is reserved exclusively for executive founder brief synthesis in src/reporting/brief.py.
"""

import logging
import re
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import GAMES, CATEGORIES, SUBCATEGORIES
from src.classification.validator import ClassificationOutput, FALLBACK_CLASSIFICATION

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Keyword Dictionaries for Classification
# ─────────────────────────────────────────────

CATEGORY_PATTERNS = {
    "Experience": {
        "Bugs / crashes": [
            r"\bcrash(es|ed|ing)?\b", r"\bfreez(e|es|ed|ing)\b", r"\bbug(s|gy)?\b",
            r"\bglitch(es|ed)?\b", r"\bblack screen\b", r"\bforce close\b",
            r"\bnot opening\b", r"\bstuck on load(ing)?\b", r"\berror\b"
        ],
        "Performance": [
            r"\blag(gy|ging)?\b", r"\bfps\b", r"\bstutter(ing)?\b", r"\bslow\b",
            r"\bbattery drain\b", r"\boverheat(ing)?\b", r"\bdisconnect(ed|ing)?\b",
            r"\bserver\b", r"\bping\b", r"\bconnection lost\b", r"\btimeout\b"
        ],
        "UI / UX": [
            r"\bui\b", r"\bux\b", r"\binterface\b", r"\bmenu\b", r"\bfont\b",
            r"\bbutton(s)?\b", r"\bgraphic(s)?\b", r"\bvisual(s)?\b", r"\bsound\b",
            r"\baudio\b", r"\bmusic\b", r"\blayout\b"
        ],
        "Onboarding": [
            r"\btutorial\b", r"\bguide\b", r"\bconfusing\b", r"\bhow to play\b",
            r"\bnew player\b", r"\bonboarding\b", r"\binstructions\b"
        ]
    },
    "Monetization": {
        "Pay-to-win pressure": [
            r"\bpay to win\b", r"\bp2w\b", r"\bpay-to-win\b", r"\bwhale(s)?\b",
            r"\bmoney grab(ber)?\b", r"\bpaywall\b", r"\bspend money\b",
            r"\bunfair advantage\b", r"\brich players\b"
        ],
        "Ads": [
            r"\bad(s)?\b", r"\badvertisement(s)?\b", r"\bcommercial(s)?\b",
            r"\bwatch video\b", r"\bpop-?up(s)?\b", r"\bforced ads\b"
        ],
        "Pricing": [
            r"\bexpensive\b", r"\bcost(ly)?\b", r"\bprice(s|y)?\b", r"\boverpriced\b",
            r"\bscam\b", r"\bgem(s)?\b", r"\bdiamond(s)?\b", r"\bcoin(s)?\b",
            r"\btokens?\b", r"\bwaste of money\b"
        ],
        "Purchases / IAP": [
            r"\bbought\b", r"\bpurchase(d|s)?\b", r"\btransaction(s)?\b",
            r"\brefund\b", r"\bbilling\b", r"\bcharged\b", r"\bdidn't receive\b",
            r"\biap\b", r"\bpayment\b"
        ],
        "Offer design": [
            r"\bbundle(s)?\b", r"\bpass\b", r"\bseason pass\b", r"\bsubscription\b",
            r"\bvip\b", r"\bdeal(s)?\b", r"\bdiscount\b", r"\boffers?\b"
        ]
    },
    "Progression": {
        "Progression speed": [
            r"\bslow progress(ion)?\b", r"\btakes too long\b", r"\bcan'?t advance\b",
            r"\bstuck at level\b", r"\bprogress(ion)?\b", r"\badvance(ment)?\b"
        ],
        "Rewards": [
            r"\breward(s)?\b", r"\bchest(s)?\b", r"\bcrate(s)?\b", r"\bdrop rate\b",
            r"\bprize(s)?\b", r"\bloot\b", r"\bfree gift(s)?\b", r"\bpack(s)?\b"
        ],
        "Upgrades": [
            r"\bupgrade(s|d)?\b", r"\blevel up\b", r"\btraining\b", r"\bstat(s)?\b",
            r"\bskill(s)?\b", r"\bcard(s)?\b", r"\bplayer level\b"
        ],
        "Difficulty / grind": [
            r"\bgrind(ing)?\b", r"\btoo hard\b", r"\bimpossible\b", r"\bdifficult(y)?\b",
            r"\brepetitive\b", r"\bboring\b", r"\bunfair level\b"
        ]
    },
    "Competition & Social": {
        "Matchmaking": [
            r"\bmatchmaking\b", r"\bmatchmaker\b", r"\bhigher level opponent\b",
            r"\boverpowered opponent\b", r"\bunfair match(es)?\b", r"\bpaired with\b",
            r"\bopponent level\b", r"\bbad match\b"
        ],
        "PvP / ranked": [
            r"\bpvp\b", r"\branked\b", r"\bladder\b", r"\btroph(y|ies)\b",
            r"\btier\b", r"\bdivision\b", r"\bleaderboard\b", r"\btournament\b",
            r"\bleague\b", r"\bmultiplayer\b"
        ],
        "Clubs / community": [
            r"\bclub(s)?\b", r"\bguild(s)?\b", r"\bclan(s)?\b", r"\bfriend(s)?\b",
            r"\bchat\b", r"\bco-?op\b", r"\bteam(s)?\b", r"\bcommunity\b"
        ],
        "Events": [
            r"\bevent(s)?\b", r"\bspecial event\b", r"\bseason\b", r"\bchallenge(s)?\b",
            r"\bworld cup\b"
        ]
    },
    "Gameplay": {
        "Balance / fairness": [
            r"\bunbalanced\b", r"\bunfair\b", r"\bcheat(er|ers|ing)?\b", r"\bhack(er|ers|ing)?\b",
            r"\bbot(s)?\b", r"\brigged\b", r"\bnerf(ed)?\b", r"\bbuff(ed)?\b",
            r"\bfairness\b", r"\bbalance\b"
        ],
        "RNG / randomness": [
            r"\bluck\b", r"\brng\b", r"\brandom(ness)?\b", r"\bchance\b",
            r"\bdice\b", r"\bpercentage\b", r"\bscripted\b"
        ],
        "Strategy / tactics": [
            r"\btactic(s|al)?\b", r"\bstrategy\b", r"\bformation\b", r"\blineup\b",
            r"\bstrategic\b", r"\bdepth\b"
        ],
        "Match / mechanics": [
            r"\bcontrol(s)?\b", r"\bbat(ting)?\b", r"\bbowl(ing)?\b", r"\bserve\b",
            r"\bracket\b", r"\bpitch(ing)?\b", r"\bswing\b", r"\btiming\b",
            r"\bhit(ting)?\b", r"\bmechanic(s)?\b", r"\bgameplay\b", r"\banimation(s)?\b",
            r"\bphysics\b", r"\bshot(s)?\b", r"\bmatch(es)?\b", r"\bplay\b"
        ]
    }
}


def _rule_based_classify(review: dict) -> ClassificationOutput:
    """
    High-speed, robust rule-based classification mapping to the 5 primary categories
    and subcategories defined in TAXONOMY.md.
    """
    raw_text = review.get("review_text") or ""
    text = raw_text.lower().strip()
    rating = review.get("rating") or 3
    if not isinstance(rating, (int, float)):
        try:
            rating = int(rating)
        except (ValueError, TypeError):
            rating = 3

    # 1. Determine Sentiment
    if rating >= 4:
        # Check if there are strong negative indicators despite a high rating
        if any(re.search(p, text) for p in [r"\bcrash\b", r"\bworst\b", r"\bscam\b", r"\bp2w\b"]):
            sentiment = "mixed"
        else:
            sentiment = "positive"
    elif rating == 3:
        sentiment = "mixed"
    else:
        sentiment = "negative"

    # 2. Match Category and Subcategory
    matched_category = None
    matched_subcategory = None
    best_match_count = 0

    # Search patterns with priority
    for cat, subcats in CATEGORY_PATTERNS.items():
        for subcat, patterns in subcats.items():
            count = 0
            for pattern in patterns:
                if re.search(pattern, text):
                    count += 1
            if count > best_match_count:
                best_match_count = count
                matched_category = cat
                matched_subcategory = subcat

    # Fallback category defaults based on rating if no pattern matches
    if not matched_category:
        if rating <= 2:
            matched_category = "Experience"
            matched_subcategory = "Bugs / crashes" if any(w in text for w in ["bad", "worst", "terrible", "hate"]) else "Performance"
        elif rating >= 4:
            matched_category = "Gameplay"
            matched_subcategory = "Match / mechanics"
        else:
            matched_category = "Gameplay"
            matched_subcategory = "Match / mechanics"

    # 3. Determine Severity (1–5)
    if rating == 1:
        if matched_subcategory in ["Bugs / crashes", "Pay-to-win pressure", "Matchmaking"]:
            severity = 5
        else:
            severity = 4
    elif rating == 2:
        severity = 3
    elif rating == 3:
        severity = 2
    else:
        severity = 1

    # 4. Determine Business Impact (1–5)
    if matched_category in ["Monetization", "Progression"]:
        business_impact = 4 if rating <= 2 else 2
    elif matched_subcategory in ["Bugs / crashes", "Matchmaking"]:
        business_impact = 5 if rating <= 2 else 3
    elif matched_category == "Gameplay":
        business_impact = 3 if rating <= 2 else 1
    else:
        business_impact = 2 if rating <= 2 else 1

    # 5. Summarize Core Issue
    if raw_text:
        # Take first sentence or up to 100 characters
        first_sentence = re.split(r"[.!?\n]", raw_text.strip())[0].strip()
        issue_text = first_sentence if first_sentence else raw_text[:100].strip()
    else:
        issue_text = f"{matched_category} feedback ({sentiment})"

    actionability = 4 if matched_category in ["Experience", "Monetization", "Progression"] else 3
    confidence = 0.85 if best_match_count > 0 else 0.50

    return ClassificationOutput(
        primary_category=matched_category,
        subcategory=matched_subcategory,
        sentiment=sentiment,
        severity=severity,
        business_impact=business_impact,
        issue=issue_text,
        actionability=actionability,
        confidence=confidence,
    )


# ─────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────
def get_active_model_name() -> str:
    return "rule_based_nlp"


def classify_review(review: dict) -> tuple[ClassificationOutput, str, bool]:
    """
    Classify a single review using high-speed deterministic NLP.
    Returns (ClassificationOutput, model_name, is_fallback).
    """
    result = _rule_based_classify(review)
    return result, "rule_based_nlp", False


def classify_batch(
    reviews: list[dict],
    progress_callback=None,
) -> list[tuple[dict, ClassificationOutput, str, bool]]:
    """
    Classify a list of reviews instantly.
    """
    results = []
    total = len(reviews)

    for i, review in enumerate(reviews):
        classification, model_name, is_fallback = classify_review(review)
        results.append((review, classification, model_name, is_fallback))

        if progress_callback:
            progress_callback(i + 1, total)

    logger.info(f"Classified {total}/{total} reviews using rule_based_nlp (0 API calls)")
    return results


def _extract_json(text: str) -> Optional[dict]:
    """Helper for extracting JSON if needed by validator tests."""
    import json
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```\s*$", "", text, flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None
