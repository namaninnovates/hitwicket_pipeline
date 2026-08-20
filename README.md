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

### 2. Environment Configuration

Create a `.env` file in `hitwicket-review-intelligence/.env`:

```env
# Gemini API Key (Used exclusively for executive Founder Brief synthesis)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.6-flash

# Optional: Neon Serverless PostgreSQL (For Vercel / Cloud deployment)
# If omitted, the pipeline defaults to local SQLite (data/reviews.db)
DATABASE_URL=postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
```

> **Dual Database Engine**: The pipeline works **100% offline out-of-the-box using local SQLite** (`data/reviews.db`). For cloud deployments on **Vercel**, simply set `DATABASE_URL` pointing to your **Neon Serverless Postgres** database, and the pipeline automatically switches to PostgreSQL with zero code changes.

> **Hybrid AI Architecture**: Review classification runs on a fast, zero-cost deterministic rule-based NLP engine (0 API calls). Google Gemini (`gemini-3.5-flash-lite`) is invoked **exactly once per run** to synthesize the executive Founder Brief, costing **~$0.00026 per pipeline run (<$0.01/month)**.

### 3. Run Pipeline (CLI)

```bash
python run_pipeline.py
```

### 4. Launch Interactive Web Dashboard & Pipeline Controller

```bash
# Terminal 1: Start FastAPI backend
python api/index.py

# Terminal 2: Start Next.js frontend
npm run dev
```
*Access the rich dark-mode executive intelligence dashboard at `http://localhost:3000`.*

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

The priority score (0–100) is calculated deterministically from stored review data:

```
Priority = (Frequency × 0.30) + (Severity × 0.25) + (Business Impact × 0.25) + (Trend × 0.20)
```

| Component | Weight | Normalization | Rationale |
|---|---|---|---|
| **Frequency** | **30%** | `(Count ÷ Total Reviews) × 100` | Problem volume indicates scale of player friction |
| **Severity** | **25%** | `((Avg Severity − 1) ÷ 4) × 100` | Severity (1–5) directly correlates with uninstall/churn risk |
| **Business Impact** | **25%** | `((Avg Impact − 1) ÷ 4) × 100` | Separates cosmetic bugs from revenue/retention threats |
| **Trend** | **20%** | `(% Change + 100) ÷ 3` | Identifies emerging crises (Current 30d vs Prior 30d) |

*Small-sample guard: If category volume is fewer than 5 reviews in the current or prior period, trend is set to neutral (50) and flagged.*

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

---

## 💰 Gemini LLM Usage & Cost Economics

| Pipeline Stage | Engine | Calls per Run | Cost |
| :--- | :--- | :---: | :---: |
| **1. Scraping & Ingest** | `google-play-scraper` (HTTP) | 0 | $0.00 |
| **2. Cleaning & Deduplication** | SQLite WAL + Regex | 0 | $0.00 |
| **3. Review Classification** | Deterministic Rule-Based NLP | 0 | $0.00 |
| **4. Priority Scoring & Matrix** | Mathematical Python Engine | 0 | $0.00 |
| **5. Executive Founder Brief** | Google Gemini (`gemini-3.5-flash-lite`) | **1** | **~$0.00026** |

* **Single Run Cost**: **~$0.00026** *(~1/40th of 1 cent)*
* **Daily Runs for a Month (30 runs)**: **<$0.01 / month**
* **Gemini is invoked exclusively for executive brief synthesis**, ensuring zero token cost during large-scale review categorization.

---

## ⚖️ Review Sampling Strategy (Equal vs. Dynamic)

* **Equal Sample Size (Recommended for Benchmarking)**: Setting equal sample sizes (e.g., 150–300 reviews per game) provides balanced statistical variance, stable error margins, and fair side-by-side comparison across competitor titles.
* **Normalized Mathematics**: If games have unequal review volumes, the scoring formula evaluates **Share of Voice** (`Frequency = (Count ÷ Total Reviews) × 100`) rather than raw counts, preventing high-volume games from distorting priorities.
* **Small Sample Safeguard**: Categories with fewer than 5 reviews automatically revert to neutral trend scores (`insufficient_sample`).

---

## 🧪 Running Tests

```bash
pytest -v
```
All 66 automated tests validate:
- Idempotent deduplication via SQLite unique constraints
- 90-day review date windowing
- Mathematical normalization & priority score boundaries ($0-100$)
- Trend calculation & sample size protection
- Pydantic validation & malformed JSON recovery
- REST API security headers, path traversal guards, and stop endpoint

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
