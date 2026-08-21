# AI Engineering Worklog & Architectural Decisions

## Executive Summary

This log documents the AI engineering trajectory, technical stack selection, verbatim prompts, empirical mistakes caught during validation, and core architectural optimizations implemented across the **Hitwicket Review Intelligence Pipeline**.

---

## Technology Stack & Tools

| Component | Tool / Model | Purpose | Why Chosen |
| :--- | :--- | :--- | :--- |
| **Executive Synthesis** | **Google Gemini (`gemini-3.5-flash-lite`)** | 90-second founder brief synthesis | Low latency, high reasoning quality, and cost efficiency (~$0.00026 / run). |
| **Review Categorization** | **Deterministic Rule-Based NLP** | Structured 5-category taxonomy classification | Sub-millisecond execution, zero API token cost ($0.00), 100% deterministic reproducibility. |
| **Public Data Ingestion** | **`google-play-scraper` (v1.2.7)** | Public Google Play review scraping | Stable UUIDs (`reviewId`), timestamped pagination, zero API keys required. |
| **Cloud Adapter** | **`apify-client`** | Cloud-managed multi-store scraper | Fallback actor support for multi-store scaling when Apify tokens are provided. |
| **Database Engines** | **Neon PostgreSQL + SQLite (WAL)** | Dual-engine transactional persistence | Cloud serverless persistence for Vercel with automatic offline SQLite fallback. |
| **Schema Validation** | **Pydantic (v2)** | Strict typing & JSON schema enforcement | Guarantees runtime safety and graceful fallback on malformed payloads. |
| **Test Framework** | **Pytest** | Automated unit & regression suite | 70 automated tests covering dedup, scoring math, date filters, and API security. |

---

## Production Prompts (Verbatim)

### Prompt: Executive Founder Brief Generator (`prompts/founder_brief.txt`)

```text
You are a mobile game product analyst writing for a founder. Be extremely concise and direct.

## Input Data
Game: {game_name}
Analysis date: {analysis_date}
Reviews analyzed: {review_count} (last 90 days, Google Play)
Data source: Google Play Store only (Android reviews)

## Priority Issues — {game_name}
{priority_issues_text}

## Trend Summary
{trend_text}

## Competitor Context
{competitor_context}

## Task
Write a founder-facing weekly brief. It must be readable in 90 seconds.

Use EXACTLY this structure:
---
# 90-Day Review Intelligence Brief — {game_name}
**{analysis_date}** | {review_count} reviews analyzed (Google Play, last 90 days)

## Biggest Emerging Problem
[2-3 sentences. What is the problem? What evidence proves it?]

## Why Now?
[2-3 sentences. What trend data shows this is becoming urgent?]

## Competitive Signal
[2-3 sentences. Is this unique to us or also in Tennis Clash / Baseball Clash? What does that mean?]

## Recommendation
[2-4 sentences. Concrete, specific action. Not "investigate" — actual decision.]

## Expected Impact
[Which metric moves? By roughly how much? What's the mechanism?]

## What NOT to Do
[1-2 sentences. Where is the evidence telling us NOT to spend effort right now?]
---
```

---

## Documented AI Mistakes Caught & Fixed

### 1. Hallucinated Google Play Package Names
* **AI Assumption**: AI assumed default corporate naming (`com.wildlifestudios.tennisclash` and `com.miniclip.baseballclash`).
* **Detection**: Live Python probe failed with `App not found (404)`.
* **Correction**: Identified true package IDs via web inspection:
  * Tennis Clash: `com.tfgco.games.sports.free.tennis.clash` (100M+ installs)
  * Baseball Clash: `com.neowiz.game.baseball.clash` (5M+ installs)
* **Key Takeaway**: Always validate package identifiers live against the store API before writing ingestion code.

---

### 2. Apple App Store Scraper Endpoint Breakdown
* **AI Assumption**: Assumed `app-store-scraper` would work out of the box for iOS reviews.
* **Detection**: Threw `JSONDecodeError: Expecting value: line 1 column 1 (char 0)` due to Apple changing its undocumented RSS endpoints.
* **Correction**: Standardized on Google Play for primary ingestion and built an Apify cloud actor adapter for multi-store extraction.
* **Key Takeaway**: Never rely on fragile, undocumented endpoints in production pipelines.

---

### 3. SQLite Transaction Lock on `VACUUM`
* **AI Assumption**: Called `VACUUM` inside an active transaction block during database reset.
* **Detection**: Endpoint failed with `sqlite3.OperationalError: cannot VACUUM from within a transaction`.
* **Correction**: Separated `DELETE` queries into an explicit transaction and executed `VACUUM` with `isolation_level = None` outside the transaction.
* **Key Takeaway**: DDL and maintenance commands like `VACUUM` must run outside active transaction boundaries.

---

## Key Architectural Optimizations

1. **Hybrid AI Cost Optimization**: Review classification runs on a zero-cost rule-based NLP engine ($0.00), while Gemini is called strictly **once per run** to synthesize the executive brief (**~$0.00026 / run**).
2. **Dual Database Engine**: Auto-switches between **Neon Serverless PostgreSQL** when `DATABASE_URL` is set and local **SQLite** when offline.
3. **Idempotency & Deduplication**: Database unique constraints (`UNIQUE(source, review_id)`) guarantee zero duplicate records across multiple runs.
