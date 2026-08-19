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

**Small-sample protection**: If either the current or prior period has fewer than 5 reviews in the category, the trend component is replaced with the midpoint (50) and flagged as `"trend_data": "insufficient_sample"`.

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

## Limitations

- **Trend requires ≥60 days of data**: On first run, prior period may be empty. In this case, trend defaults to 50 (neutral) and is flagged.
- **Severity and business_impact are LLM-assigned**: Subject to model variability. Confidence score is tracked to surface low-confidence classifications.
- **Frequency is count-based**: Games with more total reviews will naturally show higher absolute counts. All frequency scores are normalized as percentages within each game independently.

---

*Scoring model version: 1.0 | 2026-08-19*
