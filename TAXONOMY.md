# 🏷️ Mobile Sports Strategy Taxonomy & NLP Rules

## 📌 Executive Summary

This taxonomy is purpose-built for **mobile sports strategy games** (Hitwicket, Tennis Clash, Baseball Clash). It translates unstructured player feedback into **5 mutually exclusive, decision-ready categories** and **17 granular subcategories**.

> **Design Principle**: Every category maps directly to a specific product, engineering, or live-ops decision.

---

## 🏛️ The 5 Core Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REVIEW INTELLIGENCE TAXONOMY                      │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│ 1. GAMEPLAY  │2. PROGRESSION│3.MONETIZATION│4. EXPERIENCE │5. COMPETITION   │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────────────┤
│• Match Flow  │• Speed       │• Pricing     │• Bugs/Crash  │• Matchmaking    │
│• Strategy    │• Rewards     │• Ads         │• Performance │• PvP / Ranked   │
│• Balance     │• Upgrades    │• IAP / Store │• UI / UX     │• Clubs / Social │
│• RNG / Luck  │• Grind       │• Pay-to-Win  │• Onboarding  │• Live Events    │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────────┘
```

---

## 📋 Comprehensive Category Breakdown

### 1. 🎮 Gameplay
*Core mechanics, tactical depth, competitive fairness, and in-match feeling.*

| Subcategory | Scope & Keywords | Example Player Quote |
| :--- | :--- | :--- |
| **Match / mechanics** | Controls, bowling/batting timing, shot execution, match animation, physics. | *"The swing timing feels unresponsive after the latest update."* |
| **Strategy / tactics** | Team composition, player positioning, counter-strategies, tactical choices. | *"There is no depth in team selection, same lineup always wins."* |
| **Balance / fairness** | Stat balancing, character overpowered/underpowered, fair rules. | *"The new special bowler is completely broken and impossible to hit."* |
| **RNG / randomness** | Luck vs. skill ratio, unfair dice rolls, random match outcomes. | *"Too much luck involved in catching. Skill doesn't matter anymore."* |

---

### 2. 📈 Progression
*How players advance over time — leveling curves, upgrades, and reward economy.*

| Subcategory | Scope & Keywords | Example Player Quote |
| :--- | :--- | :--- |
| **Progression speed** | Level-up pacing, tier unlocks, campaign progress velocity. | *"Takes 3 weeks of daily playing just to unlock one new league."* |
| **Rewards** | Chest quality, tournament payouts, daily login gifts, drop rates. | *"Won a 10-match streak and got common duplicate cards. So unrewarding."* |
| **Upgrades** | Card upgrading, equipment enhancement, skill tree progression. | *"Card upgrade costs scale ridiculously high after level 8."* |
| **Difficulty / grind** | Grind fatigue, artificial difficulty walls, repetitive requirements. | *"The campaign difficulty spike at Level 20 is an unfair grind wall."* |

---

### 3. 💰 Monetization
*Payment models, advertising experience, spending fairness, and shop offers.*

| Subcategory | Scope & Keywords | Example Player Quote |
| :--- | :--- | :--- |
| **Pricing** | Real-money costs, subscription value, gem/coin price points. | *"Season pass price increased by 40% with fewer rewards."* |
| **Ads** | Forced ads, unskippable video frequency, broken rewarded ads. | *"Forced 30-second ad after every single 2-minute match. Uninstalled."* |
| **Purchases / IAP** | Transaction errors, missing gems, billing confirmation, store UI. | *"Bought the $9.99 welcome bundle but coins were never credited."* |
| **Pay-to-win pressure** | Free-to-play viability, spending required to stay competitive. | *"Pure P2W. Free players cannot compete once you hit Division 3."* |
| **Offer design** | Value bundles, flash sales, limited-time shop offers. | *"The popup deals are predatory and block the home screen every login."* |

---

### 4. ⚡ Experience
*Technical stability, performance, client polish, and user interface.*

| Subcategory | Scope & Keywords | Example Player Quote |
| :--- | :--- | :--- |
| **Bugs / crashes** | Game force-closing, freezes, black screen, corrupted match state. | *"App crashes to home screen during the 9th over of PvP matches."* |
| **Performance** | Frame drops, device overheating, lag spikes, high battery drain. | *"FPS drops to single digits on Galaxy S22 whenever stadiums load."* |
| **UI / UX** | Cluttered menus, confusing navigation, tiny text, slow transitions. | *"The inventory screen is confusing and requires too many taps."* |
| **Onboarding** | First-time tutorial clarity, beginner guidance, early churn points. | *"Tutorial didn't explain power shots, got destroyed in first real game."* |

---

### 5. 🏆 Competition & Social
*Multiplayer ecosystem, ladder integrity, social mechanics, and live operations.*

| Subcategory | Scope & Keywords | Example Player Quote |
| :--- | :--- | :--- |
| **Matchmaking** | Opponent level disparity, queue times, bot matching, unfair pairing. | *"I am level 5 and getting matched against level 15 maxed whales."* |
| **PvP / ranked** | Trophy loss penalties, ladder reset fairness, ranked progression. | *"Losing 40 trophies for a loss but only gaining 15 for a win is brutal."* |
| **Clubs / community** | Guild wars, club donations, leaderboards, team chat. | *"Club chat is broken and donation requests disappear."* |
| **Events** | Weekend tournaments, seasonal events, limited-time challenges. | *"The World Cup tournament event had server disconnects all weekend."* |

---

## 🎯 Classification Output Schema

Every classified review generates a strict structured payload:

```json
{
  "primary_category": "Monetization",
  "subcategory": "Pay-to-win pressure",
  "sentiment": "negative",
  "severity": 4,
  "business_impact": 5,
  "issue": "Free-to-play players face insurmountable stat gaps in Division 3+",
  "actionability": 4,
  "confidence": 0.94
}
```

---

## 💬 Handling of Short & Single-Word Reviews (Praise & Sentiment Integrity)

### How They Are Handled
Single-word reviews and brief phrases (e.g., *"good"*, *"awesome"*, *"nice game"*, *"super"*, *"nyc"*, *"❤️"*) represent a substantial fraction of mobile app store volume.

* **Macro Sentiment & Ratings**: **100% of single-word reviews are ingested and preserved in database storage**. Their 5★/1★ ratings directly drive:
  - Overall store average star ratings (e.g. `3.72 ★`).
  - Positive vs. negative sentiment distribution ratios (`67.4% Positive`, `27.4% Negative`).
  - Total volume telemetry across games (`383 total ingested`).
  - Competitor benchmark leaderboards.
* **Category & Subcategory Tagging (`—`)**: They are intentionally left unassigned in the taxonomy.

### Why They Are Not Assigned to Categories

| Reason | Technical & Product Rationale |
| :--- | :--- |
| **Lack of Diagnostic Context** | Generic praise (*"good"*, *"super"*) contains zero technical or gameplay context. It does not indicate whether the player enjoyed the bowling physics, progression speed, matchmaking, or UI. |
| **Preventing AI Hallucination** | Forcing an LLM (Gemini) to categorize *"good"* would require it to guess/hallucinate a feature (e.g., guessing *"Gameplay > Match"* without evidence), distorting the priority score distribution. |
| **Actionable Engineering Backlog** | The goal of taxonomy classification is to create an engineering and product backlog. Generic praise cannot be translated into a sprint ticket or roadmap deliverable. |
| **Token & Latency Efficiency** | Text with fewer than 10 characters (`MIN_REVIEW_LENGTH = 10` in `config.py`) bypasses the LLM classification stage, drastically reducing API costs and latency while preserving full mathematical rating value. |

---

## 🚫 Explicit Exclusions & Mergers

| Excluded Topic | Disposition | Rationale |
| :--- | :--- | :--- |
| **Narrative / Lore** | Excluded | Sports games have zero story mode; accounted for $<0.1\%$ of reviews. |
| **Accessibility** | Merged into `Experience > UI/UX` | Too infrequent for standalone category. |
| **Customer Support** | Merged into `Experience > UI/UX` | Support complaints accompany broken purchases or unresolved bugs. |
| **Account / Login** | Merged into `Experience > Bugs / crashes` | Auth failures are technical blockers. |
| **Graphics / Art Style** | Merged into `Experience > UI/UX` | Visual praise/criticism belongs in client experience. |
