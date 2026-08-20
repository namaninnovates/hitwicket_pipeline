# 🎯 Priority Scoring Model & Weight Justification

## 📌 Summary

Every issue category for every game gets a single **Priority Score (0–100)**. The score is fully explainable — any number can be traced back to its four inputs.

> **Core Question**: *"What should the team fix first, and what is the cost of inaction?"*

---

## 🧮 The Formula

```
Priority Score = (Frequency × 0.30) + (Severity × 0.25) + (Business Impact × 0.25) + (Trend × 0.20)
```

All four components are normalized to a 0–100 scale before weighting.

---

## 📊 The Four Components

### 1. Frequency — 30% Weight

**What it measures**: What share of all classified reviews mention this issue?

```
Frequency Score = (Count in Category ÷ Total Classified Reviews) × 100
```

- A problem affecting **1%** of players scores **1 / 100**
- A problem affecting **20%** of players scores **20 / 100**

> **Note on Classified Sample**: Total Classified Reviews includes all substantive reviews ($\ge 10$ characters). Short/single-word reviews (*"good"*, *"awesome"*) are counted in total ingested volume and average star rating metrics, but bypass topic classification because they lack diagnostic issue details.

---

### 2. Severity — 25% Weight

**What it measures**: How badly does this issue disrupt the player's experience?

```
Severity Score = ((Avg Severity Rating − 1) ÷ 4) × 100
```

| Rating | Meaning |
| :---: | :--- |
| 1 | Minor cosmetic flaw — doesn't affect match flow |
| 2 | Noticeable irritation — slightly reduces enjoyment |
| 3 | Significant disruption — affects key game flows |
| 4 | Major blocker — causes session abandonment |
| 5 | Fatal — causes immediate uninstall or refund |

---

### 3. Business Impact — 25% Weight

**What it measures**: How directly does this issue threaten revenue, retention, or store ratings?

```
Business Impact Score = ((Avg Business Impact − 1) ÷ 4) × 100
```

| Rating | Meaning |
| :---: | :--- |
| 1 | Cosmetic — no commercial risk |
| 2 | Marginal — slight engagement drop |
| 3 | Moderate — affects session length or D7 retention |
| 4 | High — triggers spending aversion or negative review waves |
| 5 | Critical — threatens the entire business model or core competitive position |

---

### 4. Trend Velocity — 20% Weight

**What it measures**: Is this issue getting worse or better? Compares volume in the last 30 days vs. the prior 30 days.

```
% Change     = ((Current 30d Count − Prior 30d Count) ÷ max(Prior Count, 1)) × 100
% Change     = clamped to −100% … +200% to prevent small-sample distortion
Trend Score  = (% Change + 100) ÷ 3
```

| % Change | Trend Score | Interpretation |
| :--- | :---: | :--- |
| −100% (fully resolved) | 0 / 100 | Issue is disappearing |
| 0% (stable) | 33 / 100 | Neutral baseline |
| +100% (doubled) | 67 / 100 | Escalating — watch closely |
| +200% (tripled) | 100 / 100 | Crisis — act immediately |

---

## 🔬 Evidence & Weight Selection Rationale

Why were these exact weights chosen instead of alternative distributions?

### 1. Why Frequency is 30% (and not 50% or 15%)
* **Evidence**: In mobile gaming, public app store star ratings are driven by aggregate complaint volume. A single bug mentioned by 25% of all reviewers drags store ratings down from 4.4★ to 3.8★, destroying organic App Store Optimization (ASO) and user acquisition.
* **Why not 50%?**: If frequency dominates at 50%+, high-volume low-severity complaints (e.g. *"give more free coins"*) would crowd out fatal, crash-inducing bugs that affect only 4% of players.
* **Why not 15%?**: If frequency is too low, engineering resources get diverted to isolated edge cases that only a handful of players ever encounter.

---

### 2. Why Severity is 25% (and not 40% or 10%)
* **Evidence**: Severity directly measures **churn causality**. Industry telemetry shows that 1-star reviews citing fatal crashes or lost account data lead to permanent uninstalls within 24 hours.
* **Why not 40%?**: At 40%, a single 1-star review on an obscure device could artificially propel an isolated bug to top priority.
* **Why not 10%?**: At 10%, catastrophic game-breaking bugs would be ignored until thousands of players have already uninstalled.

---

### 3. Why Business Impact is 25% (and not 40% or 10%)
* **Evidence**: Free-to-play mobile sports strategy games rely heavily on healthy monetization loops (battle passes, card upgrades) and long-term D30 retention. An issue that creates pay-to-win backlash directly destroys payer conversion and lifetime value (LTV).
* **Why not 40%?**: Purely revenue-weighted prioritization causes studios to ignore player fun and usability, causing long-term retention decay.
* **Why not 10%?**: A founder must distinguish between harmless quality-of-life complaints and issues that actively threaten the business model.

---

### 4. Why Trend Velocity is 20% (and not 35% or 0%)
* **Evidence**: Mobile games run bi-weekly live-ops updates. Trend velocity provides **early warning telemetry** — detecting when a new patch introduces a regression before it accumulates weeks of volume.
* **Why not 35%?**: 30-day review windows are statistically noisier than cumulative volume. A 35% weight would cause false-alarm panics from small-sample percentage spikes.
* **Why not 0% (or 5%)?**: Without trend detection, an emerging crisis that doubled in volume this week would stay buried beneath legacy historical complaints.

---

### 5. Why Not Equal Weights (25% / 25% / 25% / 25%)?
* **Statistical Rigor**: Frequency represents the **cumulative empirical volume of hundreds of players**, whereas Trend represents a **short-term rate-of-change delta**.
* Giving equal weight (25%) to a volatile 30-day velocity metric as cumulative player volume introduces unnecessary noise. Frequency must carry the primary anchor weight (30%), while Trend acts as the responsive modifier (20%).

---

## 🛡️ Anti-Outlier Protections

### Sample Size Confidence Dampener

A single review cannot outscore a widespread recurring issue. A confidence multiplier scales the raw score down when data is thin:

```
Confidence = min(1.0, Count ÷ 5)
```

| Reviews in Category | Confidence | Effect |
| :---: | :---: | :--- |
| 1 | 0.20 | Score dampened by 80% |
| 2 | 0.40 | Score dampened by 60% |
| 3 | 0.60 | Score dampened by 40% |
| 4 | 0.80 | Score dampened by 20% |
| 5+ | 1.00 | Full score applied |

### Small-Sample Trend Guard

If either the current or prior 30-day window has fewer than 5 reviews in the category, the trend score defaults to a neutral **50 / 100** and is flagged as `insufficient_sample`. This prevents a single new complaint from triggering a false "+200% escalation".

---

## 🚦 Priority Tiers

| Score | Risk Level | Action |
| :---: | :--- | :--- |
| 50 – 100 | 🔴 Critical | Immediate fix — hotfix, executive review, or emergency sprint |
| 30 – 49 | 🟡 Moderate | Schedule in the next product sprint |
| 0 – 29 | 🟢 Low | Monitor — healthy baseline or resolved |

---

## 📝 Full Worked Example

**Scenario**: Pay-to-Win pressure complaints for Hitwicket, 500 total classified reviews.

| Input | Raw Value |
| :--- | :--- |
| Complaints in category | 45 reviews |
| Total classified reviews | 500 reviews |
| Average Severity rating | 4.2 / 5.0 |
| Average Business Impact rating | 4.6 / 5.0 |
| Current 30-day volume | 30 complaints |
| Prior 30-day volume | 15 complaints |

**Step-by-step calculation**:

```
Frequency Score      = (45 ÷ 500) × 100           =  9.0
Severity Score       = ((4.2 − 1) ÷ 4) × 100      = 80.0
Business Imp. Score  = ((4.6 − 1) ÷ 4) × 100      = 90.0

% Change             = ((30 − 15) ÷ 15) × 100      = +100%
Trend Score          = (100 + 100) ÷ 3             = 66.7

Priority = (9.0 × 0.30) + (80.0 × 0.25) + (90.0 × 0.25) + (66.7 × 0.20)
         =  2.70 + 20.00 + 22.50 + 13.34
         =  58.5  →  59 / 100  (Critical Priority 🔴)
```
