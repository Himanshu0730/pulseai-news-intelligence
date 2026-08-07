# PulseAI System Architecture & Engineering Specifications

## 1. Executive System Overview
PulseAI is a defensible, production-grade AI news intelligence platform designed to eliminate information overload. Instead of displaying disjointed RSS streams, PulseAI automatically normalizes news URLs into deterministic canonical IDs, performs multi-layered deduplication, clusters related coverage into coherent story threads, computes real signal-based trending metrics, ranks personalized content using implicit user behavioral decay models, and delivers grounded cross-source AI briefings with misinformation risk detection.

```
                  +-------------------------------------------------------+
                  |               Client Web Interface (React 19)         |
                  +-------------------------------------------------------+
                                              |
                                              v (HTTPS / REST API)
                  +-------------------------------------------------------+
                  |               Node.js Express Server (Port 3000)      |
                  +-------------------------------------------------------+
                                              |
       +-------------------+------------------+-------------------+-------------------+
       |                   |                  |                   |                   |
       v                   v                  v                   v                   v
[News Service]   [Deduplication]     [Clustering]       [Trend Engine]    [Personalization]
  Provider Chain   Canonical Matching  Incremental Jaccard  Signal Velocity   Decay Weighted
 (NewsAPI/GNews)   & Title Similarity   Threshold Grouping   Multi-Publisher   Behavioral Score
       |                   |                  |                   |                   |
       +-------------------+------------------+-------------------+-------------------+
                                              |
                                              v
                      +-----------------------------------------------+
                      | RAG & Misinformation Risk Pipeline           |
                      | - Gemini 3.6 Flash (Structured Briefings)     |
                      | - Hugging Face XLM-RoBERTa Fake News Model   |
                      | - Primary Source & Fact-Check Verification    |
                      +-----------------------------------------------+
                                              |
                                              v
                      +-----------------------------------------------+
                      | Persistence Layer                             |
                      | - PostgreSQL Pool (Supabase/Cloud SQL)        |
                      | - In-Memory / JSON Resilient Store            |
                      +-----------------------------------------------+
```

## 2. Core Service Modules
- **`server/utils/urlNormalizer.ts`**: URL tracking parameter stripping, fragment removal, protocol normalization, and deterministic 16-character SHA-256 ID hash generation.
- **`server/services/deduplicationService.ts`**: Multi-layer deduplication (Canonical URL match, title token similarity >= 0.75, 48h publication window).
- **`server/services/clusteringService.ts`**: Threshold-based story clustering that groups multi-outlet reporting into unified story clusters.
- **`server/services/trendService.ts`**: Signal-driven trend analyzer combining coverage velocity, source diversity, freshness, and user interaction.
- **`server/services/personalizationService.ts`**: Dual-factor recommendation engine blending explicit interests and implicit interaction decay weights with transparent explanation tags.
- **`server/services/misinformationService.ts`**: Multi-signal factual integrity pipeline integrating Hugging Face `iceman2434/xlm-roberta-base-fake-news-detection-tlog` classification with primary source corroboration.
- **`server/services/ragService.ts`**: Grounded 60-second briefing engine with strict JSON schema and evidence extraction.

## 3. Resilience & Environment
- **Host Binding**: Binds to `0.0.0.0:3000` for cloud containers while logging local development access via `http://localhost:3000`.
- **Database Fallback**: Utilizes PostgreSQL pool when `DATABASE_URL` is configured, with auto-fallback to local persisted JSON store during local testing.
- **Provider Failover**: Zero-config Curated Live RSS provider guarantees 100% uptime when external API keys encounter quota limits.
