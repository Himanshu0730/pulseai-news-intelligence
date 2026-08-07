# PulseAI — Architecture & Design Decisions Rationale

## 1. Executive Summary
This document records the architectural and design decisions behind PulseAI's evolution from a traditional news aggregator into an AI-powered News Intelligence Platform.

---

## 2. Key Design Decisions

### Decision 1: Editorial Visual Hierarchy vs. Symmetric Grid Cards
* **Context**: Earlier iterations presented news stories as uniform 3-column card grids with identical card dimensions.
* **Problem**: Equal-sized cards created cognitive overload and failed to communicate story urgency or editorial importance.
* **Decision**: Adopted a newspaper editorial layout structure:
  1. Top: Large Editorial Hero Story with rich summary briefing and lead publisher attribution.
  2. Middle: Developing News Stream in a balanced grid with distinct category tags.
  3. Side: High Coverage Velocity trends and RAG Source Grounding verification modules.
* **Impact**: Users immediately grasp top headlines within 3 seconds of page load.

---

### Decision 2: Slide-Over Drawer Reader vs. Modal Popups
* **Context**: Detailed story briefings and AI summaries previously opened in centered modal popups.
* **Problem**: Center popups felt disruptive, covered background context, and caused "modal fatigue" when clicking between multiple stories.
* **Decision**: Replaced center popups with a slide-over Intelligence Drawer (`StoryDetailModal.tsx` & `ArticleDetailModal.tsx`).
* **Impact**: Provides a calmer, distraction-free reading atmosphere that mimics premium news platforms like Reuters and The Financial Times while keeping contextual navigation intact.

---

### Decision 3: Dual Typographic Hierarchy (Serif + Sans-Serif)
* **Context**: Generic SaaS templates use a single sans-serif font (e.g., Inter or Roboto) across all UI elements.
* **Problem**: Standard sans-serif fonts lack news authority and make long-form reading tiring.
* **Decision**: Implemented `Source Serif 4` for headlines and narrative story text paired with `Plus Jakarta Sans` for UI navigation, badges, and controls.
* **Impact**: Establishes immediate newsroom authority and improves long-form reading legibility.

---

### Decision 4: Transparent Multi-Source Attribution & RAG Citations
* **Context**: Many AI news summarizers present generated text without clear source attribution, risking hallucinations.
* **Problem**: Users cannot verify the origin of AI claims or cross-reference differing outlet perspectives.
* **Decision**: Integrated explicit multi-outlet source badges, trust percentage scores, political bias spectrum meters, and a dedicated "RAG Supporting Evidence Inspector" tab.
* **Impact**: Builds trust by proving every AI summary point is anchored to verified published reports.

---

### Decision 5: Non-Disruptive Inline AI Interactions
* **Context**: Requesting AI summaries or coverage comparisons previously opened separate popup dialogs.
* **Problem**: Excessive dialog popups broke reader momentum.
* **Decision**: Provided inline expansion controls (`AISummaryModal.tsx`, `CompareCoverageModal.tsx`, inline briefing previews on cards) that expand smoothly in-place or within the active reader view.
* **Impact**: Smooth, responsive user workflow with zero friction.
