# PulseAI Verification & Test Suite Specifications

## 1. Automated Test Execution
Run the complete automated test suite using Node.js native runner and `tsx`:

```bash
npm test
```

## 2. Test Coverage Matrix
- **`URL Normalization & Deterministic Article IDs`**: Verifies URL parameter stripping, hash removal, protocol standardization, and SHA-256 ID hash stability.
- **`Layered Deduplication Service`**: Tests exact canonical URL matching and title Jaccard token similarity deduplication.
- **`Real Story Clustering Engine`**: Validates grouping of multi-outlet coverage into unified story clusters.
- **`Signal-Based Trend Detection`**: Tests coverage velocity, publisher diversity, and user interaction scoring.
- **`Behavioral Personalization Ranking`**: Tests explicit interest matching, interaction topic decay, and transparent explanation tags.
- **`Misinformation Risk Pipeline`**: Validates Hugging Face XLM-RoBERTa classification and PIB fact-check verdict evaluation.
- **`Curated RSS Provider`**: Tests zero-config fallback headlines, category filtering, and search.
