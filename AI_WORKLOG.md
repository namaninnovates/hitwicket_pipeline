# AI Work Log

## 1. Tools and Models Used

| Tool / Model | Purpose | Rationale |
|---|---|---|
| **Google Gemini 2.0 Flash / 1.5 Flash** | Review classification & structured JSON extraction | Fast, high-accuracy structured JSON parsing with schema enforcement via Pydantic; generous free-tier rate limits. |
| **google-play-scraper (v1.2.7)** | Public Google Play review ingestion | Free, zero-infrastructure Python library capable of paginating live reviews with stable IDs, timestamps, and ratings. |
| **Apify Client (`apify-client`)** | Managed Google Play & App Store actor ingestion | Production-grade scraping fallback and multi-store support when API tokens are provided. |
| **SQLite3 (with WAL mode)** | Local transactional storage | Embedded, zero-setup, ACID-compliant database with `UNIQUE(source, review_id)` constraints ensuring 100% idempotent re-runs. |
| **Pydantic (v2)** | Classification output validation | Strict runtime type-checking and validation for LLM responses, ensuring invalid taxonomies/scores fail fast with fallback. |
| **Pytest** | Automated unit & regression test suite | Validates deduplication, 90-day windowing, priority scoring mathematics, and JSON parsing. |

---

## 2. Strongest Prompts (Verbatim)

### Prompt 1: Structured Review Classification (`prompts/classify_review.txt`)

```text
You are a mobile game review analyst specializing in strategy sports games.

Your task: Classify the following app store review for a mobile sports/strategy game.

## Review Details
Game: {game_name}
Rating: {rating}/5
Review Text: "{review_text}"

## Classification Categories
Primary categories (choose exactly one):
- Gameplay: Core game mechanics, match experience, strategic depth, balance, RNG/randomness
- Progression: How players advance — level speed, rewards, upgrades, grind difficulty
- Monetization: Payment model, ads, IAP, pay-to-win pressure, offer design
- Experience: Technical quality — bugs, crashes, performance, lag, UI/UX, onboarding
- Competition & Social: Matchmaking, PvP/ranked ladder, clubs/guilds, live events

## Output Format
Return ONLY a valid JSON object. No explanation, no markdown, no code blocks.

{
  "primary_category": "<one of the 5 categories above>",
  "subcategory": "<specific subcategory within the primary category>",
  "sentiment": "<positive|negative|mixed|neutral>",
  "severity": <1-5 integer, where 1=minor annoyance, 5=causes uninstall>,
  "business_impact": <1-5 integer, where 1=cosmetic, 5=threatens revenue/retention>,
  "issue": "<one sentence: the core complaint or praise, plain English>",
  "actionability": <1-5 integer, where 1=cannot fix, 5=clear product action exists>,
  "confidence": <0.0-1.0 float, your confidence in this classification>
}

## Rules
- If the review is too short or ambiguous to classify confidently, still return JSON with low confidence (<0.5)
- Severity should be informed by the rating: 1-2 star reviews with strong language = severity 4-5
- A 5-star review praising gameplay = sentiment "positive", severity 1
- Do NOT return anything except the JSON object
```

### Prompt 2: 90-Second Founder Brief Generator (`prompts/founder_brief.txt`)

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
# Weekly Review Brief — {game_name}
**{analysis_date}** | {review_count} reviews analyzed

## ⚡ Biggest Emerging Problem
[2-3 sentences. What is the problem? What evidence proves it?]

## 🕐 Why Now?
[2-3 sentences. What trend data shows this is becoming urgent?]

## 🌍 Competitive Signal
[2-3 sentences. Is this unique to us or also in Tennis Clash / Baseball Clash? What does that mean?]

## ✅ Recommendation
[2-4 sentences. Concrete, specific action. Not "investigate" — actual decision.]

## 📈 Expected Impact
[Which metric moves? By roughly how much? What's the mechanism?]

## ❌ What NOT to Do
[1-2 sentences. Where is the evidence telling us NOT to spend effort right now?]

---

## Rules
- No charts, no bullet walls, no "in conclusion"
- Write as if texting a smart colleague, not filing a report
- Use exact numbers from the input data — never round to "many" or "some"
- If data is limited (small sample), say so explicitly rather than overstating confidence
```

---

## 3. Documented AI Mistake

### Mistake 1: Confident Hallucination of Google Play Package Identifiers

**Claim:**
During initial investigation, AI assumed standard developer naming conventions and stated that Tennis Clash had package ID `com.wildlifestudios.tennisclash` and Baseball Clash had package ID `com.miniclip.baseballclash`.

**How I caught it:**
Before writing the pipeline, Phase 1 required live source validation. I executed a direct Python probe against Google Play metadata for both packages:
```python
gp_app('com.wildlifestudios.tennisclash')
gp_app('com.miniclip.baseballclash')
```

**Evidence:**
Both calls threw immediate `App not found (404)` exceptions. The assumed package names did not exist on Google Play.

**Correction:**
Conducted web searches for the true published package names:
- Tennis Clash: `com.tfgco.games.sports.free.tennis.clash` (Wildlife Studios' legacy corporate entity TFG Co)
- Baseball Clash: `com.neowiz.game.baseball.clash` (Developed by Neowiz, published with Miniclip)

Re-ran live validation probe and confirmed 100M+ and 5M+ installs respectively.

**Lesson:**
Never assume mobile store bundle IDs or package names from developer brand names. Always validate package identifiers live against the store API before writing ingestion code.

---

### Mistake 2: Assuming Apple App Store Scraper would work without testing

**Claim:**
AI assumed `app-store-scraper` would smoothly extract reviews for all 3 apps via the public App Store endpoints.

**How I caught it:**
Ran live scraper validation during Phase 1:
```python
app = AppStore(country='us', app_name='hitwicket', app_id='1442127530')
app.review(how_many=3)
```

**Evidence:**
Output: `[ERROR] Base - Something went wrong: Expecting value: line 1 column 1 (char 0)`
Fetched 0 reviews. Apple altered their public JSON endpoints, breaking the undocumented scraper.

**Correction:**
Documented this finding honestly in `SOURCE_RESEARCH.md`, selected Google Play as the single consistent primary source, and built an Apify adapter for managed multi-store access.

**Lesson:**
Public endpoints for closed ecosystems are unstable. A pipeline must be built with graceful fallbacks and clear source attribution.

---

### Mistake 3: Overly Strict Pydantic Query Range on `limit`

**Claim:**
During endpoint security hardening, `limit: int = Query(200, ge=1, le=1000)` was added to `/api/reviews` to prevent oversized payloads.

**How I caught it:**
When clicking "All" in the Review Explorer UI, the frontend sent `limit=0` (signifying unbounded query). The API returned an `HTTP 422 Unprocessable Entity`, causing the UI to display `0 matching reviews`.

**Correction:**
Updated the parameter definition to `Query(200, ge=0, le=10000)` where `0` explicitly indicates "All records" and bounded the upper limit safely to 10,000.

**Lesson:**
Always cross-reference API parameter boundary constraints with frontend UI state conventions (such as `0` or `null` for "All").

---

## 4. Key Architectural Decisions & Optimizations

### 1. Hybrid Intelligence Model (Zero-Cost Classification + Gemini Brief)
- **Review Classification**: Moved to a high-speed, deterministic rule-based NLP engine ([`src/classification/classifier.py`](file:///Users/guptanaman/Projects/hitwicket-review-intelligence/src/classification/classifier.py)) implementing the complete 5-category taxonomy. Eliminates external API dependencies and reduces review categorization time from minutes to milliseconds at **$0.00 cost**.
- **Founder Brief Synthesis**: Google Gemini (`gemini-3.5-flash-lite`) is invoked **strictly once per pipeline execution** to synthesize high-level strategic takeaways, competitor matrices, and 90-second executive summaries (**~$0.00026 / run**).

### 2. Review Sampling Strategy (Equal vs. Dynamic Volume)
- **Equal Sample Sizes**: Recommended for competitive benchmarking (150–300 reviews per title) to ensure consistent statistical variance, stable error margins, and reliable trend detection.
- **Normalized Frequency**: All category metrics are computed as percentages within each game independently ($\frac{\text{Count}}{\text{Total Game Reviews}} \times 100$), ensuring fair comparisons even when review volumes differ.

### 3. Pipeline Lifecycle Management (Live Progress & Process Stop)
- Added real-time stage progress tracking and an explicit `POST /api/pipeline/stop` endpoint allowing users to terminate long-running scraping or analysis tasks cleanly with immediate subprocess `SIGTERM`/`SIGKILL` and concurrency lock release.
