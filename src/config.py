"""
Central configuration for the Hitwicket Review Intelligence Pipeline.
All app IDs, constants, and settings are defined here.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

# ─────────────────────────────────────────────
# Directories
# ─────────────────────────────────────────────
DATA_DIR = ROOT_DIR / "data"
OUTPUTS_DIR = ROOT_DIR / "outputs"
PROMPTS_DIR = ROOT_DIR / "prompts"
LOGS_DIR = DATA_DIR / "logs"

DATA_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────
DB_PATH = DATA_DIR / "reviews.db"

# ─────────────────────────────────────────────
# Games to track
# ─────────────────────────────────────────────
GAMES = {
    "hitwicket": {
        "name": "Hitwicket",
        "google_play_id": "cricketgames.hitwicket.strategy",
        "app_store_id": "1442127530",
        "display_name": "Hitwicket™ Cricket Game",
    },
    "tennis_clash": {
        "name": "Tennis Clash",
        "google_play_id": "com.tfgco.games.sports.free.tennis.clash",
        "app_store_id": "1335720938",
        "display_name": "Tennis Clash: Multiplayer Game",
    },
    "baseball_clash": {
        "name": "Baseball Clash",
        "google_play_id": "com.neowiz.game.baseball.clash",
        "app_store_id": "1531238634",
        "display_name": "Baseball Clash: Real-time game",
    },
}

APIFY_API_TOKEN = os.environ.get("APIFY_API_TOKEN") or os.environ.get("APIFY_TOKEN")

# ─────────────────────────────────────────────
# Ingestion settings
# ─────────────────────────────────────────────
REVIEW_WINDOW_DAYS = 90          # Only keep reviews from this many days back
MAX_REVIEWS_PER_GAME = 5000      # Max reviews to fetch per game (enough to cover full 90 days)
FETCH_BATCH_SIZE = 200           # Reviews per API call (max supported: 200)
FETCH_SLEEP_SECONDS = 0.5        # Polite delay between paginated calls
REVIEW_LANG = "en"
REVIEW_COUNTRY = "us"

# ─────────────────────────────────────────────
# Classification settings
# ─────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_FALLBACK_MODEL = "gemini-1.5-flash"
CLASSIFICATION_MAX_RETRIES = 3
CLASSIFICATION_BATCH_SIZE = 10   # Number of reviews per LLM call (batched for efficiency)
MIN_REVIEW_LENGTH = 10           # Skip classification of very short reviews (noise)

# ─────────────────────────────────────────────
# Taxonomy
# ─────────────────────────────────────────────
CATEGORIES = [
    "Gameplay",
    "Progression",
    "Monetization",
    "Experience",
    "Competition & Social",
]

SUBCATEGORIES = {
    "Gameplay": ["Match / mechanics", "Strategy / tactics", "Balance / fairness", "RNG / randomness"],
    "Progression": ["Progression speed", "Rewards", "Upgrades", "Difficulty / grind"],
    "Monetization": ["Pricing", "Ads", "Purchases / IAP", "Pay-to-win pressure", "Offer design"],
    "Experience": ["Bugs / crashes", "Performance", "UI / UX", "Onboarding"],
    "Competition & Social": ["Matchmaking", "PvP / ranked", "Clubs / community", "Events"],
}

SENTIMENTS = ["positive", "negative", "mixed", "neutral"]

# ─────────────────────────────────────────────
# Scoring weights (see SCORING.md)
# ─────────────────────────────────────────────
SCORE_WEIGHT_FREQUENCY = 0.30
SCORE_WEIGHT_SEVERITY = 0.25
SCORE_WEIGHT_BUSINESS_IMPACT = 0.25
SCORE_WEIGHT_TREND = 0.20

TREND_WINDOW_DAYS = 30           # Days in each trend comparison window
MIN_TREND_SAMPLE = 5             # Minimum reviews for a valid trend

# ─────────────────────────────────────────────
# Reporting
# ─────────────────────────────────────────────
TOP_N_ISSUES = 5                 # Top N issues to highlight in brief
