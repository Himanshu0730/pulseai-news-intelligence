# Grounded RAG AI Briefing Engine Specifications

## 1. Grounded Retrieval Architecture
PulseAI implements a strict evidence-first Retrieval-Augmented Generation (RAG) framework for generating 60-second executive story briefings. Rather than asking Gemini to summarize arbitrary web knowledge, the system feeds an **Evidence Pack** compiled from verified multi-outlet coverage in a story cluster.

```
[ Story Cluster Articles ]
          |
          v
[ Evidence Pack Construction ] ---> Include Publisher, Title, Date, Description, Body
          |
          v
[ Gemini 3.6 Flash JSON Schema ] ---> Grounded Briefing Prompt
          |
          v
[ Strict JSON Output Validation ]
  ├── whatHappened
  ├── whyItMatters
  ├── confirmedFacts[]
  ├── uncertainties[]
  ├── sourceAgreement[]
  └── sourceDifferences[]
```

## 2. Hallucination Guardrails
1. **Explicit Source Grounding**: The prompt mandates that every statement in `confirmedFacts` must be backed by a cited article in the Evidence Pack.
2. **Uncertainty Isolation**: Unverified claims or conflicting projections are explicitly extracted into the `uncertainties` array rather than presented as facts.
3. **Low Confidence Fallback**: If the evidence pack contains fewer than 2 sources or missing body text, the system marks `confidence: "low"` or falls back to clean extracted metadata without generating speculative text.
