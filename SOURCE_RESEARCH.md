# 📡 Empirical Review Source Research & Evaluation

## 📌 Executive Summary

To ensure **real, reliable, and reproducible review intelligence**, 5 distinct data ingestion methods were empirically evaluated across **Hitwicket**, **Tennis Clash**, and **Baseball Clash**. 

> **Verdict**: **Google Play Store via `google-play-scraper` (v1.2.7)** was selected as the primary ingestion engine, supplemented by an **Apify managed adapter** for multi-store cloud scaling.

---

## 🔬 Empirical Source Comparison

| Data Source | Type | Cost | Real Public Reviews? | Stable Unique IDs? | 90-Day Time Window? | Evaluation Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`google-play-scraper` (v1.2.7)** | Public Scraper | **$0.00** | ✅ Yes | ✅ Yes (`reviewId` UUID) | ✅ Yes (`at` ISO timestamp) | 🟢 **SELECTED (Primary)** |
| **Apify Client (`apify-client`)** | Managed Cloud Actor | Free Tier | ✅ Yes | ✅ Yes | ✅ Yes | 🟢 **SELECTED (Cloud Adapter)** |
| **Apple RSS Feed (Undocumented)** | Public Feed | **$0.00** | ⚠️ Partial | ❌ No (volatile) | ❌ No (max 500 reviews) | 🔴 **EXCLUDED (Broke in testing)** |
| **Google Play Developer API** | Official API | Paid / Owned | ❌ No | ✅ Yes | ✅ Yes | 🔴 **EXCLUDED (Requires App Ownership)** |
| **App Store Connect API** | Official API | Paid / Owned | ❌ No | ✅ Yes | ✅ Yes | 🔴 **EXCLUDED (Requires App Ownership)** |

---

## 🧪 Detailed Source Investigations

### 1. `google-play-scraper` (Selected Primary Engine)
* **Library**: `google-play-scraper` Python package (v1.2.7).
* **Live Test Results**: Confirmed functional across all 3 target titles:
  * **Hitwicket**: `cricketgames.hitwicket.strategy` (10M+ installs, 4.39★)
  * **Tennis Clash**: `com.tfgco.games.sports.free.tennis.clash` (100M+ installs, 4.62★)
  * **Baseball Clash**: `com.neowiz.game.baseball.clash` (5M+ installs, 4.40★)
* **Extracted Schema**:
  * `reviewId`: Immutable UUID used for database `UNIQUE(source, review_id)` deduplication.
  * `content`: Full unedited review text.
  * `score`: 1–5 star player rating.
  * `at`: Python `datetime` for strict 90-day lookback windowing.
  * `appVersion`: App release version string (e.g. `7.2.1`).
  * `thumbsUpCount`: Player upvote count indicating community agreement.

---

### 2. Apple App Store RSS Feed (Investigation & Failure Analysis)
* **Endpoint Tested**: `https://itunes.apple.com/us/rss/customerreviews/id=1442127530/sortBy=mostRecent/json`
* **Live Test Result**: `JSONDecodeError: Expecting value: line 1 column 1 (char 0)`
* **Root Cause**: Apple altered its public JSON response structure, causing unmaintained community scrapers (`app-store-scraper` v0.3.5) to fail silently.
* **Architecture Decision**: Rather than relying on fragile undocumented Apple endpoints that break without notice, the core pipeline standardizes on Google Play's reliable public API.

---

### 3. Official Developer APIs (Ownership Constraint)
* **Google Play Developer API & App Store Connect API**:
  * Both official APIs require OAuth2 service account authentication tied directly to the developer console.
  * **Fundamental Blocker**: They only permit querying reviews for apps you own. Competitor intelligence on third-party titles (Tennis Clash, Baseball Clash) is strictly forbidden.

---

## 🛡️ Reliability & Rate-Limit Safeguards

1. **Polite Paging**: Implements a `0.5s` delay between paginated batches to respect Google's public endpoints.
2. **Batch Windowing**: Scrapes newest reviews first and halts pagination immediately once reviews older than 90 days are encountered.
3. **Idempotency Guarantee**: All fetched reviews pass through SQLite / Neon PostgreSQL `INSERT OR IGNORE` / `ON CONFLICT DO NOTHING`, guaranteeing zero duplicate records across multiple runs.
