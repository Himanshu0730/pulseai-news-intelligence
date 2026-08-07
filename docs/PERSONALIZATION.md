# Behavioral Personalization & Explainability Specification

## 1. Multi-Factor Scoring Formula
PulseAI calculates a personalization score (0 to 100) for every article in the user's feed using a weighted multi-factor formula:

$$\text{Score} = 0.30 \cdot I + 0.20 \cdot B + 0.20 \cdot G + 0.15 \cdot F + 0.10 \cdot E + 0.05 \cdot T$$

Where:
- **$I$ (Explicit Interest Match)**: Match against user selected categories (e.g. Technology, AI & ML).
- **$B$ (Behavioral Topic Match)**: Match against implicit interaction topic history.
- **$G$ (Geographic Relevance)**: Boost for Indian national/state stories or South Asian coverage.
- **$F$ (Freshness)**: Exponential decay based on hours since publication date.
- **$E$ (Engagement Level)**: Read time minutes and depth indicators.
- **$T$ (Global Trending Score)**: Cross-platform coverage velocity.

## 2. Interaction Event Weights
User actions increment implicit topic scores with differential weights:
- **Bookmark**: +4 points (High intent signal)
- **AI Summary Request**: +3 points (In-depth interest)
- **Article Detail View**: +2 points (Reading signal)
- **Search Query**: +1 point (Exploratory intent)

## 3. Explainability Tags
Every ranked article displays a human-readable explanation tag describing why it appears in the feed:
- *"Recommended because you frequently read AI & Policy"*
- *"Matched to your Business interest • India Priority"*
- *"India Headlines & Regional Relevance"*
