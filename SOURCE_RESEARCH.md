# Source Research

## Investigation Summary

This document records the research conducted before writing the ingestion pipeline to ensure real, reliable, re-runnable review data.

---

## Sources Evaluated

### 1. Google Play Developer API (Official)
- **URL**: https://developer.android.com/google/play/developer-api
- **Access**: Requires OAuth2 credentials and ownership of the app
- **Review access**: Only for apps you own
- **Verdict**: ❌ Not usable — we are analyzing competitor apps

### 2. Apple App Store Connect API (Official)
- **URL**: https://developer.apple.com/documentation/appstoreconnectapi
- **Access**: Requires Apple Developer account + private key + app ownership
- **Review access**: Only for apps you own
- **Verdict**: ❌ Not usable — we are analyzing competitor apps

### 3. Apple App Store RSS Feed (Undocumented Public)
- **URL pattern**: `https://itunes.apple.com/{country}/rss/customerreviews/id={appId}/sortBy=mostRecent/json`
- **Access**: Public, no auth required
- **Limitations**:
  - Hard cap of 500 reviews total (10 pages × 50)
  - Country-specific (would need to query multiple countries)
  - Undocumented — can break without notice
  - No app version field
- **Live test result**: `app-store-scraper` v0.3.5 threw a JSON parse error on all 3 apps during live testing (`Expecting value: line 1 column 1 (char 0)`). This indicates Apple has changed the endpoint response format.
- **Verdict**: ❌ Failed live validation — excluded

### 4. `google-play-scraper` Python Library (Community, Public)
- **PyPI**: https://pypi.org/project/google-play-scraper/
- **Version tested**: 1.2.7
- **Access**: No API key, no auth, public data only
- **What it exposes**:
  - `reviewId` (stable unique identifier)
  - `content` (full review text)
  - `score` (1–5 rating)
  - `at` (datetime of review)
  - `appVersion` (when set by user, nullable)
  - `thumbsUpCount` (helpful votes)
  - `replyContent` / `repliedAt` (developer reply if any)
- **Pagination**: Yes, via `continuation_token` — can fetch hundreds to thousands of recent reviews
- **Date filtering**: Post-hoc only (filter on `at` field after fetch)
- **Rerunnable**: Yes — fetches newest first, can stop when date threshold exceeded
- **Live test result**: ✅ Confirmed working for all 3 games

### 5. Commercial Scraping Services (SerpApi, Apify, etc.)
- **Access**: Paid API key required
- **Verdict**: ❌ Excluded — assignment requires no paid infrastructure

---

## Selected Approach

**Google Play only, via `google-play-scraper` v1.2.7**

### Rationale

1. **Live validation confirmed** — fetched real reviews with dates, text, ratings for all 3 apps in seconds
2. **No paid infrastructure** — open source, free
3. **Consistent across all 3 games** — avoids fragile multi-source architecture
4. **Stable unique IDs** — `reviewId` (UUID format) enables safe duplicate prevention
5. **Date available** — `at` field allows accurate 90-day filtering
6. **Pagination** — `continuation_token` allows fetching enough reviews for meaningful analysis

### Confirmed App Identifiers

| Game | Google Play Package ID | Installs | Rating |
|------|----------------------|----------|--------|
| Hitwicket | `cricketgames.hitwicket.strategy` | 10M+ | 4.39 ★ |
| Tennis Clash | `com.tfgco.games.sports.free.tennis.clash` | 100M+ | 4.62 ★ |
| Baseball Clash | `com.neowiz.game.baseball.clash` | 5M+ | 4.40 ★ |

---

## Acknowledged Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| Google Play only (no iOS) | Android-biased sample | Stated clearly in all reports |
| App version not always populated | Some `app_version` fields will be NULL | Stored as NULL, not fabricated |
| Google may throttle heavy scraping | Could miss some reviews | Rate limiting with `time.sleep()` between pages |
| `google-play-scraper` may break if Google changes its internal API | Pipeline could fail silently | Error handling + logged warnings |
| Reviews are sorted by "newest" but date gaps can exist | 90-day coverage not always 100% | All ingested dates are stored; report states coverage window |

---

## Data Fields Available

```
reviewId      → maps to review_id in our schema
content       → review_text
score         → rating (1–5)
at            → review_date (datetime)
appVersion    → app_version (nullable)
thumbsUpCount → auxiliary, not used in scoring
```

---

*Research conducted: 2026-08-19*
*Live tests run: All 3 Google Play packages confirmed functional*
*Apple App Store: Excluded due to scraper failure during live validation*
