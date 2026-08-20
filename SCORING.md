# Priority Scoring Model

## Purpose

An explicit, reproducible scoring formula that converts classified review data into a single priority score (0–100) per issue category per game.

The score must be **explainable** — a founder should be able to trace any score back to its inputs.

---

## Formula

```
Priority = 0.30 × Frequency + 0.25 × Severity + 0.25 × BusinessImpact + 0.20 × Trend
```

All components are normalized to 0–100 before weighting.

---

## Components

### Frequency (weight: 0.30)

**Definition**: What percentage of all classified reviews for this game mention this category?

**Formula**:
```
Frequency_normalized = (count_in_category / total_classified_reviews) × 100
```

**Rationale**: The most important signal — volume indicates how many players are experiencing this issue. A problem mentioned by 1% of players is fundamentally different from one mentioned by 18%.

**Weight 30%**: Highest weight because it directly reflects the scale of the player experience problem. A beautiful design cannot compensate for a problem affecting a large portion of players.

---

### Severity (weight: 0.25)

**Definition**: Average severity score (1–5) of reviews in this category, normalized to 0–100.

**Formula**:
```
Severity_normalized = ((avg_severity - 1) / 4) × 100
```
*(Maps 1→0, 5→100)*

**Rationale**: A frequently mentioned issue that only causes minor irritation (severity 1–2) is less urgent than a less-frequent issue causing players to uninstall (severity 4–5).

**Weight 25%**: Second-highest because severity directly correlates with churn probability. A severity-5 issue (uninstall-triggering) demands immediate action even at lower frequency.

---

### Business Impact (weight: 0.25)

**Definition**: Average business impact score (1–5) of reviews in this category, normalized to 0–100.

**Formula**:
```
BusinessImpact_normalized = ((avg_business_impact - 1) / 4) × 100
```

**Rationale**: Some issues are emotionally upsetting but don't threaten the business (e.g. cosmetic complaints). Business Impact distinguishes revenue/retention-threatening problems from quality-of-life issues.

**Weight 25%**: Equal to severity because the combination of "hurts players AND hurts the business" is what creates urgency. A founder needs to know what moves metrics, not just what annoys players.

---

### Trend (weight: 0.20)

**Definition**: Is this issue growing or shrinking? Compares volume in the most recent 30-day window vs. the prior 30-day window.

**Formula**:
```
pct_change = ((count_current - count_prior) / max(count_prior, 1)) × 100

# Clamp to [-100, +200] to prevent outlier distortion
pct_change_clamped = max(-100, min(200, pct_change))

# Shift to [0, 100] scale where:
#   -100% change → 0 (rapidly declining problem)
#   0% change    → 33 (stable)
#   +100% change → 67 (doubling)
#   +200% change → 100 (tripling — severe escalation)
Trend_normalized = (pct_change_clamped + 100) / 3
```

**Rationale**: A stable 15% frequency problem is less urgent than a 7% frequency problem that doubled in 30 days. Trend captures emerging crises before they peak.

**Weight 20%**: Lowest weight because trends can be noisy with small sample sizes. The formula explicitly degrades gracefully when data is insufficient.

**Small-sample protection**: If either the current or prior period has fewer than 10 reviews in the category, the trend component is flagged as `"trend_data": "insufficient_sample"` (neutral baseline).

---

### Sample Size Confidence Dampener (Anti-Outlier Protection)

To guarantee that single-review anomalies (e.g. $N=1$) cannot score 60/100 and outrank widespread recurring issues affecting dozens of players, the engine applies a statistical confidence dampener:

$$\text{Confidence Factor} = \min\left(1.0, \frac{\text{Count}}{5.0}\right)$$

* For **$N < 5$ reviews**: Priority is proportionally scaled by the sample confidence ($N=1 \to \times 0.20$, $N=2 \to \times 0.40$, $N=3 \to \times 0.60$, $N=4 \to \times 0.80$). Additionally, unearned neutral trend points are zeroed out until a meaningful sample is established.
* For **$N \ge 5$ reviews**: Full priority score is applied ($\text{Confidence Factor} = 1.0$).

---

## Worked Example

```
Category: Progression / Grind
Game: Hitwicket

count_in_category: 54
total_classified: 300
avg_severity: 4.2
avg_business_impact: 4.5
count_current_30d: 34
count_prior_30d: 25

Frequency_normalized  = (54 / 300) × 100 = 18.0
Severity_normalized   = ((4.2 - 1) / 4) × 100 = 80.0
BusinessImpact_norm   = ((4.5 - 1) / 4) × 100 = 87.5
pct_change            = ((34 - 25) / 25) × 100 = +36%
Trend_normalized      = (36 + 100) / 3 = 45.3

Priority = 0.30(18.0) + 0.25(80.0) + 0.25(87.5) + 0.20(45.3)
         = 5.40 + 20.00 + 21.88 + 9.07
         = 56.35 → 56/100
```

---

## Output Format

The scoring output for each category/game combination:

```
Progression / Grind — Hitwicket
─────────────────────────────────────────────
Frequency:       18% of reviews    → 18.0 / 100
Severity:        4.2 / 5           → 80.0 / 100
Business Impact: 4.5 / 5          → 87.5 / 100
Trend:           +36% (30d)       → 45.3 / 100
─────────────────────────────────────────────
Priority Score:  56 / 100
```

---

## Weight Justification Summary

| Component | Weight | Key Rationale |
|-----------|--------|---------------|
| Frequency | 30% | Scale of problem determines resource allocation priority |
| Severity | 25% | High severity → high churn risk |
| Business Impact | 25% | Distinguishes player frustration from business threat |
| Trend | 20% | Captures emerging crises; lower weight due to sample noise |

---

---

## Sample Size Strategy & Cross-Game Balancing

### Should the Number of Reviews per Game Be the Same?

**Yes, equal sample sizes (e.g., 150–300 reviews per game) are recommended for competitive benchmarking**, though the mathematical model is designed to handle unequal counts safely.

### 1. Why Equal Sample Sizes Provide Superior Benchmarking
- **Variance & Error Margin Stability**: If Game A has 500 reviews and Game B has only 15 reviews, a single 1-star review in Game B represents 6.7% of all complaints, whereas in Game A it represents only 0.2%. Equal samples ensure balanced statistical confidence across all titles.
- **Trend Detection Reliability**: The trend formula ($\Delta\% = \frac{C_{\text{current}} - C_{\text{prior}}}{C_{\text{prior}}}$) requires stable volume in both periods to avoid false escalations.
- **Visual Parity**: Side-by-side sentiment distributions and matrix comparisons reflect equal depth of player feedback.

### 2. How the Formula Prevents Raw Count Distortion
When review counts differ across games (e.g., due to natural download volume differences):
- **Normalized Frequency (Share of Voice)**:
  $$\text{Frequency}_{\text{normalized}} = \left( \frac{\text{Category Complaints}}{\text{Total Game Reviews}} \right) \times 100$$
  The model never compares raw complaint counts (e.g. 50 vs 500); it evaluates the proportion of player dissatisfaction within each game's own ecosystem.
- **Small-Sample Safeguards (`MIN_TREND_SAMPLE = 5`)**:
  If either period contains fewer than 5 reviews, the trend defaults to neutral (50) and is labeled `insufficient_sample`.

### 3. Recommended Pipeline Sampling Strategies

| Goal | Sampling Strategy | Sidebar Configuration |
| :--- | :--- | :--- |
| **Fair Competitive Benchmark** *(Recommended)* | **Equal Sample Size** | Set **Max Reviews = 150–300** and select all 3 games. |
| **Natural Market Velocity** | **Time-Window Driven** | Set **Window = 30 or 90 days**, Max Reviews = 1000+ (captures natural review velocity). |
| **Hitwicket Deep Dive** | **Hitwicket Focused** | Run Hitwicket with 500+ reviews to catch edge-case bugs, competitors with 100 reviews. |

---

## Limitations

- **Trend requires ≥60 days of data**: On first run, prior period may be empty. In this case, trend defaults to 50 (neutral) and is flagged.
- **Frequency is count-based**: Games with more total reviews will naturally show higher absolute counts. All frequency scores are normalized as percentages within each game independently.

---

*Scoring model version: 1.1 | 2026-08-20*
