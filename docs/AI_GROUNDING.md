# AI Grounding & Hallucination Mitigation Specifications

## 1. Grounding Protocol
All AI features in PulseAI (Executive Summaries, 60-Second Briefings, Cross-Source Comparisons, Translations) are enforced by technical guardrails against hallucination:

1. **Strict Context Isolation**: Gemini prompts explicitly forbid external speculation and require all claims to cite supplied evidence.
2. **Structured Output Schemas**: All responses use strict JSON Schema definitions via `@google/genai` SDK `responseSchema`.
3. **Structured Fallback Data**: When AI keys are unconfigured or rate-limited, the system returns structured fallback data derived strictly from extracted article text.
4. **Uncertainty Highlighting**: The system explicitly isolates conflicting or missing evidence into an `uncertainties` field rather than fabricating answers.
