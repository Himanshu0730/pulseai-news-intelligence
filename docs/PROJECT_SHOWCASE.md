# PulseAI — AI News Intelligence Platform (Project Showcase)

## 1. Problem Statement
Modern news consumption is broken by two competing extremes:
1. **Information Overload**: Readers are bombarded with hundreds of duplicate articles reporting on the same event with minor variations.
2. **Echo Chambers & Media Bias**: Single-outlet reading conceals political skew, selective reporting, and unverified claims.

PulseAI solves this by transforming news consumption into **News Intelligence** — aggregating coverage, clustering related stories, scoring publisher trust, evaluating misinformation risk, and synthesizing objective briefings powered by Google Gemini AI.

---

## 2. Core Platform Capabilities & Architecture

### A. Intelligent Story Clustering & Aggregation
* Automatically groups multi-publisher articles reporting on the same developing event into a single cohesive **Story Intelligence Cluster**.
* Computes multi-outlet coverage consensus, highlighting areas of outlet agreement versus divergent reporting.

### B. Grounded Gemini AI Executive Briefings
* Generates concise, bulleted executive briefings ("What Happened", "Why It Matters", "Confirmed Facts", and "What's Uncertain").
* Every AI statement is mapped to supporting RAG citations from primary source articles.

### C. Publisher Trust & Media Bias Evaluation
* Evaluates publisher credibility using historical trust scores (0–100%) and political spectrum analysis (Left, Center-Left, Center, Center-Right, Right).
* Detects misinformation risk levels (Low, Medium, High Risk) with actionable verification advice.

### D. Scope Filtering (India vs. World)
* Instant scope toggle to focus specifically on Indian national policy, state developments, tech hubs, and official PIB press releases, or expand to global international headlines.

### E. Multi-Language & Offline Reading
* Native multi-language translation support (English, Hindi, Spanish, French, German) with client-side bookmarking for offline reading.

---

## 3. Technology Stack & Architecture

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
* **Typography**: Source Serif 4 (Editorial Headlines/Reader), Plus Jakarta Sans (Interface/Controls), JetBrains Mono (Metrics)
* **Icons**: Lucide React
* **AI Engine**: Google Gemini API (`@google/genai` SDK)
* **Animations & Micro-Interactions**: Tailwind CSS animations, smooth layout transitions
* **I18n**: Custom lightweight reactive translation framework

---

## 4. Key Engineering & UX Highlights

1. **Editorial Newspaper Aesthetics**: Designed to feel like a high-end publication (Reuters, Financial Times, Ground News) rather than a generic SaaS dashboard.
2. **Zero Modal Fatigue**: Slide-over intelligence drawers replace disruptive full-screen popups.
3. **Accessibility First**: WCAG AA color contrast compliance, keyboard focus rings, and high contrast mode toggles.
4. **Performance & Light Footprint**: Instant client-side state caching, debounced search filters, and lightweight CSS utility bundles.
