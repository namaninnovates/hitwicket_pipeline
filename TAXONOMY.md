# Taxonomy

## Purpose

A classification taxonomy purpose-built for mobile sports strategy games. Designed to produce decision-relevant signals for a game founder — not academic completeness.

The taxonomy must answer: **"What should we fix, build, or avoid?"**

---

## Design Principles

1. **Decision-useful**: Every category maps to a concrete product or business decision
2. **Mutually exclusive at primary level**: A review can have one clear primary category
3. **Applicable cross-game**: All 5 categories apply to Hitwicket, Tennis Clash, and Baseball Clash
4. **Not artificially granular**: Subcategories exist only where they drive meaningfully different decisions
5. **Excludes low-signal areas**: Categories that rarely appear or don't affect decisions are excluded

---

## Final Taxonomy

### 1. Gameplay
**Definition**: Feedback about the core game mechanics, match experience, strategic depth, and balance of the competitive system.

| Subcategory | Definition |
|-------------|------------|
| Match / mechanics | How matches play out: controls, timing, flow, fun |
| Strategy / tactics | Depth of decision-making, team building, planning |
| Balance / fairness | Whether the game feels fair between players of similar level |
| RNG / randomness | Whether luck feels disproportionate to skill |

**Why it exists**: The core loop is the product's reason for being. High negative signal here is existential — players quit if matches feel bad.

---

### 2. Progression
**Definition**: Feedback about how players advance over time — speed of leveling up, reward quality, upgrade systems, and whether grind feels rewarding or punishing.

| Subcategory | Definition |
|-------------|------------|
| Progression speed | Too fast / too slow advancement |
| Rewards | Quality and frequency of earned rewards |
| Upgrades | Player/team/item upgrade systems |
| Difficulty / grind | Whether grinding feels worthwhile or frustrating |

**Why it exists**: Progression is the #1 driver of long-term retention in mobile strategy games. A broken progression loop churns mid-funnel players who have already invested time.

---

### 3. Monetization
**Definition**: Feedback about the payment model, ad experience, in-app purchases, perceived fairness of spending, and offer design.

| Subcategory | Definition |
|-------------|------------|
| Pricing | Cost of items, passes, subscriptions |
| Ads | Ad frequency, intrusive ads, forced ads |
| Purchases / IAP | In-app purchase experience |
| Pay-to-win pressure | Whether spending feels required to compete |
| Offer design | Value of bundles, events, limited offers |

**Why it exists**: Monetization complaints directly correlate with rating drops and uninstalls. The pay-to-win subcategory is especially important for competitive games — it signals competitive integrity breakdown.

---

### 4. Experience
**Definition**: Feedback about the technical quality of the game — crashes, lag, UI design, and the onboarding experience for new players.

| Subcategory | Definition |
|-------------|------------|
| Bugs / crashes | App crashes, broken features, data loss |
| Performance | Lag, load times, battery drain, frame drops |
| UI / UX | Navigation, clarity, information design |
| Onboarding | Tutorial quality, new player experience |

**Why it exists**: Experience issues create a "floor" problem — players can't tolerate bugs regardless of gameplay quality. Performance is a hygiene metric; poor scores here undermine everything else.

---

### 5. Competition & Social
**Definition**: Feedback about multiplayer matching, the competitive ladder, social features (clubs, guilds, friends), and live events.

| Subcategory | Definition |
|-------------|------------|
| Matchmaking | Opponent quality, wait times, ranking fairness |
| PvP / ranked | Competitive ladder experience |
| Clubs / community | Guild/club mechanics, social bonding |
| Events | Live events, seasonal content, limited-time modes |

**Why it exists**: For real-time multiplayer sports games, matchmaking quality is a primary differentiator. Poor matchmaking destroys competitive player retention, which anchors the entire top of funnel.

---

## Classification Fields

Each review receives:

| Field | Type | Values |
|-------|------|--------|
| `primary_category` | enum | Gameplay, Progression, Monetization, Experience, Competition & Social |
| `subcategory` | string | One of the subcategory names above |
| `sentiment` | enum | positive, negative, mixed, neutral |
| `severity` | int | 1 (minor annoyance) → 5 (game-breaking / quit-inducing) |
| `business_impact` | int | 1 (cosmetic) → 5 (directly affects revenue or retention) |
| `issue` | string | One-sentence plain-English summary of the core complaint or praise |
| `actionability` | int | 1 (can't fix) → 5 (clear product action exists) |
| `confidence` | float | 0.0 → 1.0 (classifier's confidence in the categorization) |

---

## Excluded / Merged Categories

| Excluded Category | Reason |
|------------------|--------|
| **Content / Story** | Sports games have minimal narrative — appeared in <1% of test reviews |
| **Accessibility** | No reviews referenced accessibility features in pilot sample |
| **Customer Support** | Treated as an Experience subcategory when it appears, not a separate category |
| **Login / Account** | Merged into Bugs/Experience subcategory |
| **Graphics / Art** | Almost always positive and not decision-driving; absorbed into UI/UX |
| **Notifications** | Too niche; merged into Experience > UI/UX |

---

## Severity Scale

| Score | Meaning |
|-------|---------|
| 1 | Minor annoyance — doesn't affect continued play |
| 2 | Noticeable friction — reduces enjoyment |
| 3 | Significant problem — affects key flows |
| 4 | Major issue — causes session abandonment |
| 5 | Game-breaking — causes uninstall or refund |

## Business Impact Scale

| Score | Meaning |
|-------|---------|
| 1 | Cosmetic / doesn't affect metrics |
| 2 | Minor UX friction — marginally affects engagement |
| 3 | Affects retention or session length |
| 4 | Directly affects churn or revenue conversion |
| 5 | Existential — threatens the business model or core competitive position |

---

*Taxonomy version: 1.0 | 2026-08-19*
