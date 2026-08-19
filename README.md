# 🏏 Hitwicket Review Intelligence Pipeline

A modular, re-runnable review intelligence pipeline that ingests **real public app-store reviews from the last 90 days** for **Hitwicket**, **Tennis Clash**, and **Baseball Clash**, classifies them via structured LLM taxonomy, computes mathematically rigorous priority scores, and generates a **decision-ready 90-second founder brief** with a dark-mode interactive dashboard.

---

## ⚡ Quick Start

### 1. Installation

```bash
# Navigate to project
cd hitwicket-review-intelligence

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration (Optional)

Create a `.env` file in `hitwicket-review-intelligence/.env`:

```env
# For LLM-based classification & brief generation (Optional - rule-based fallback included)
GEMINI_API_KEY=your_gemini_api_key

# For Apify cloud scraping (Optional - local google-play-scraper included by default)
APIFY_API_TOKEN=your_apify_api_token
```

> **Note:** The pipeline works 100% out of the box without any paid API keys! If no `GEMINI_API_KEY` is provided, it uses an intelligent rule-based keyword classifier.

### 3. Run Pipeline (CLI)

```bash
python run_pipeline.py
```

### 4. Launch Interactive Streamlit Dashboard (with Live Pipeline Controller)

```bash
streamlit run dashboard.py
```
*Allows triggering pipeline runs, re-running stages, exploring live reviews, and viewing the founder brief with one click.*

---

## 🎬 Live Demonstration Flow (2-Run Requirement)

The assignment requires demonstrating that the pipeline is **re-runnable and idempotent** without duplicating or corrupting data.

### Run 1: Initial Ingestion, Classification & Reporting
```bash
python run_pipeline.py
```
**Expected Output:**
- Fetches real 90-day reviews from Google Play for Hitwicket, Tennis Clash, and Baseball Clash
- Stores new reviews in SQLite (`data/reviews.db`)
- Classifies unclassified reviews
- Computes priority scores and competitor comparison matrix
- Generates `outputs/YYYY-MM-DD/founder_brief_hitwicket.md` and `outputs/YYYY-MM-DD/report.html`

### Run 2: Re-running on Existing Database
```bash
python run_pipeline.py
```
**Verification Points for Run 2:**
1. **0 Duplicate Reviews Added**: `New reviews: 0` (or only genuine new reviews published since Run 1)
2. **0 Redundant LLM Calls**: Already classified reviews are skipped automatically
3. **Deterministic Priority Scores**: Output scores remain stable and explainable
4. **Updated Run Log**: New entry recorded in `pipeline_runs` table

---

## 🏗️ Architecture & Pipeline Stages

```
INGEST ──► CLEAN ──► CLASSIFY ──► SCORE ──► ANALYZE ──► GENERATE BRIEF
```

```
hitwicket-review-intelligence/
├── data/
│   └── reviews.db          # SQLite database (WAL mode, unique constraints)
├── src/
│   ├── config.py           # Central configurations, app IDs, weights
│   ├── ingestion/
│   │   ├── fetcher.py       # Google Play scraper with pagination & 90d windowing
│   │   ├── apify_fetcher.py # Apify actor adapter (Google Play & App Store)
│   │   └── storage.py       # SQLite CRUD, INSERT OR IGNORE, run logging
│   ├── cleaning/
│   │   └── cleaner.py       # Date filtering, whitespace normalization, substance check
│   ├── classification/
│   │   ├── classifier.py    # LLM classification with retries & fallback
│   │   └── validator.py     # Pydantic schema validator for structured JSON
│   ├── scoring/
│   │   └── priority.py      # Priority score formula & trend computation
│   ├── analysis/
│   │   └── competitor.py    # Competitor comparison matrix & Hitwicket specificity
│   └── reporting/
│       ├── brief.py         # 90-second founder brief generator
│       └── html_report.py   # Interactive dark-mode HTML dashboard
├── prompts/
│   ├── classify_review.txt  # Few-shot structured review classification prompt
│   └── founder_brief.txt    # 90-second decision-ready founder brief prompt
├── outputs/
│   └── YYYY-MM-DD/
│       ├── founder_brief_hitwicket.md
│       └── report.html
├── tests/
│   ├── conftest.py          # Shared fixtures & in-memory SQLite DB
│   ├── test_dedup.py        # Duplicate handling & unique constraint tests
│   ├── test_filtering.py    # 90-day windowing & date boundary tests
│   ├── test_scoring.py      # Priority math, normalization, & sample guard tests
│   └── test_classification.py # Pydantic validation & malformed JSON tests
├── run_pipeline.py          # Main CLI orchestrator
├── SOURCE_RESEARCH.md       # Empirical review source investigation
├── TAXONOMY.md              # 5-category mobile sports taxonomy
├── SCORING.md               # Priority scoring mathematical formula & weights
├── AI_WORKLOG.md            # Tools, verbatim prompts, and caught AI mistakes
└── README.md
```

---

## 📊 Priority Scoring Formula

The priority score ($0 - 100$) is calculated deterministically from stored review data:

$$\text{Priority} = 0.30 \times \text{Frequency} + 0.25 \times \text{Severity} + 0.25 \times \text{BusinessImpact} + 0.20 \times \text{Trend}$$

| Component | Weight | Normalization | Rationale |
|---|---|---|---|
| **Frequency** | **30%** | $\frac{\text{count}}{\text{total reviews}} \times 100$ | Problem volume indicates scale of player friction |
| **Severity** | **25%** | $\frac{\text{avg severity} - 1}{4} \times 100$ | Severity (1-5) directly correlates with uninstall/churn risk |
| **Business Impact** | **25%** | $\frac{\text{avg impact} - 1}{4} \times 100$ | Separates cosmetic bugs from revenue/retention threats |
| **Trend** | **20%** | $\frac{\Delta\% + 100}{3}$ | Identifies emerging crises (Current 30d vs Prior 30d) |

*Small-sample guard: If category volume $< 5$ in current or prior period, trend is set to neutral (50) and flagged.*

See [SCORING.md](SCORING.md) for full mathematical documentation and worked examples.

---

## 🗂️ Taxonomy Overview

Designed specifically for mobile sports strategy games:

1. **Gameplay**: Match mechanics, strategy/tactics, balance/fairness, RNG/randomness
2. **Progression**: Progression speed, rewards, upgrades, difficulty/grind
3. **Monetization**: Pricing, ads, purchases/IAP, pay-to-win pressure, offer design
4. **Experience**: Bugs/crashes, performance/lag, UI/UX, onboarding
5. **Competition & Social**: Matchmaking, PvP/ranked ladder, clubs/community, live events

See [TAXONOMY.md](TAXONOMY.md) for definitions and exclusion rationale.

---

## 🧪 Running Tests

```bash
pytest -v
```
All 58 unit tests validate:
- Idempotent deduplication via SQLite unique constraints
- 90-day review date windowing
- Mathematical normalization & priority score boundaries ($0-100$)
- Trend calculation & sample size protection
- Pydantic validation & malformed JSON recovery

---

## ⚙️ CLI Options

```bash
# Run specific stages
python run_pipeline.py --stages ingest score brief

# Limit reviews fetched per game (for quick testing)
python run_pipeline.py --max-reviews 50

# Target a single game
python run_pipeline.py --games hitwicket

# Custom review window
python run_pipeline.py --window-days 60

# Verbose logging
python run_pipeline.py -v
```
