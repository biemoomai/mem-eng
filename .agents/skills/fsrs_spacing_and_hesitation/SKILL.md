---
name: fsrs-spacing-and-hesitation
description: Guidelines and mathematical formulas for the FSRS Spaced Repetition model and millisecond-level Response Time (Cognitive Hesitation Penalty) calculations.
---

# FSRS Spaced Repetition & Cognitive Hesitation Guidelines

This document outlines the spacing equations and dynamic response-time rules for calculating memory updates.

---

## 1. Core Algorithm: FSRS

Memory retention is modeled exponentially based on:

\[R(t, S) = 0.9^{\frac{t}{S}}\]

Where:
*   **\(R\)**: Retrievability (probability of recall). Target baseline is **\(90\%\)** (\(R = 0.9\)).
*   **\(t\)**: Elapsed time in days since the last review.
*   **\(S\)**: Memory Stability (number of days for \(R\) to drop to 90%).
*   **\(D\)**: Card Difficulty (scale 1–10).

Review intervals:
\[I = \text{round}(S)\]

If a card's interval grows to **\(\ge 21\) days**, it transitions to the **Mastered** state.

---

## 2. Response Time (RT) & Cognitive Hesitation Penalty

*   \(RT_{\text{base}}\) = **\(1,500\text{ ms}\)** (Baseline fast recall).
*   \(RT_{\text{threshold}}\) = **\(4,000\text{ ms}\)** (Above 4 seconds indicates retrieval struggle).

During review, if the user takes longer than \(RT_{\text{threshold}}\) to submit their rating, calculate a **Hesitation Penalty (\(\beta\))**:

\[\beta = \max\left(0.5, \ 1 - \frac{RT - RT_{\text{base}}}{8000}\right)\]

This penalty coefficient is applied directly to scale down the stability update equation:

\[S_{\text{new}} = S_{\text{old}} \times \left(1 + (\text{Factor} - 1) \times \beta\right)\]

This ensures words where the user hesitated are scheduled to reappear sooner, preventing false-positives.
