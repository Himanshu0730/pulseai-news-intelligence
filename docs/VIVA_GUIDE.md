# Academic Viva Defense & Presentation Guide for PulseAI

## 1. Executive Problem Statement & Motivation
**Question**: *Why build PulseAI when platforms like Google News or Feedly exist?*
**Answer**: Existing news aggregators suffer from three critical flaws:
1. **Information Overload**: Unfiltered duplicate headlines from hundreds of syndicates.
2. **Sensationalism & Misinformation**: Sensational headlines shared without source verification.
3. **Black-Box Personalization**: Opaque algorithms that create filter bubbles without explaining why content is recommended.

PulseAI solves these issues through a defensible intelligence pipeline:
- Normalizes URLs and deduplicates coverage at the canonical level.
- Groups fragmented reporting into unified story threads with cross-source agreement/differences.
- Evaluates misinformation risk using Hugging Face XLM-RoBERTa NLP models and primary source verification.
- Ranks feeds with transparent, human-readable explainability tags.

## 2. Technical Architecture Highlights
- **Stack**: React 19, TypeScript, Express, PostgreSQL, Gemini 3.6 Flash, Hugging Face Inference API.
- **Deduplication**: Multi-layer pipeline combining SHA-256 canonical URL hashing and Jaccard token similarity (threshold >= 0.75).
- **Clustering**: Incremental threshold-based grouping measuring title token similarity and publication window.
- **Trend Engine**: Multi-signal formula combining Coverage Velocity, Publisher Diversity, Freshness Decay, and User Interaction.
- **Grounding**: RAG evidence packs with strict JSON Schema outputs preventing hallucinated summaries.

## 3. Anticipated Viva Defense Questions & Key Answers
- **Q**: *How do you handle GNews or NewsAPI rate limits?*
  **A**: PulseAI implements provider failover and rate-limit cooldown management. If GNews returns HTTP 429, it enters a 15-minute cooldown, and the system seamlessly fails over to NewsAPI and our Curated Live RSS provider.

- **Q**: *How do you detect fake news?*
  **A**: PulseAI uses a multi-signal misinformation pipeline integrating Hugging Face's `iceman2434/xlm-roberta-base-fake-news-detection-tlog` model, corroborating publisher counts, official fact-check registry verdicts (e.g. PIB Fact Check), and primary document links.
