# PulseAI — Responsive Design & Adaptive Layout Guide

## 1. Overview
PulseAI adapts seamlessly across desktop monitors, tablets, and smartphones, ensuring that news intelligence features (multi-outlet comparison, AI summaries, source trust indicators, and RAG citations) remain accessible without layout breakage or horizontal overflow.

---

## 2. Responsive Breakpoints

| Breakpoint | Width Range | Target Devices | Layout Strategy |
| :--- | :--- | :--- | :--- |
| **Mobile** | `< 640px` | Smart phones (iPhone, Pixel) | Single-column feed, sticky top header, touch-first targets (44px+) |
| **Tablet** | `640px - 1023px` | iPads, Android tablets, portrait displays | Balanced 2-column grid, compact sidebar drawer toggles |
| **Desktop** | `1024px - 1279px` | Laptops (MacBook Air 13", 14") | 3-column editorial grid with sticky right-hand intelligence sidebar |
| **Wide Desktop** | `≥ 1280px` | Large monitors, 4K displays | Max-width constrained container (`max-w-7xl mx-auto`) with wide breathing room |

---

## 3. Screen-by-Screen Adaptive Patterns

### A. Homepage & Feed (`/src/pages/HomePage.tsx`)
* **Desktop (1024px+)**:
  * Left / Main Column (66% width): Editorial hero story lead card at the top, followed by a 2-column developing news stream.
  * Right Sidebar (33% width): Sticky "Signal-Driven Trends" section and "Source Grounding" feature cards.
* **Tablet (640px - 1023px)**:
  * Hero story scales gracefully to full-width container.
  * Developing news stream renders as a balanced 2-column grid.
  * Sidebar stacks below the main feed.
* **Mobile (< 640px)**:
  * Pure single-column feed.
  * Action buttons scale to full touch targets.
  * Category navigation bar is horizontally scrollable with hidden scrollbars (`no-scrollbar overflow-x-auto`).

### B. Article Reader & Drawer (`/src/components/news/StoryDetailModal.tsx` & `ArticleDetailModal.tsx`)
* **Desktop**: Slide-over drawer occupying 75% screen width (`max-w-5xl h-full`) with right-side AI intelligence panel.
* **Mobile & Tablet**: Full-screen overlay drawer with tabbed navigation between "AI Briefing", "Reporting Outlets", "Timeline", and "RAG Citations".

### C. Navigation Bar (`/src/components/common/Navbar.tsx`)
* **Desktop**:
  * Primary navigation (Logo, Category scope dropdown, India/World scope pills, Search input bar, Bookmarks, Language selector, Theme toggle, Profile button).
* **Mobile**:
  * Collapsible mobile drawer menu featuring full-width search bar, quick scope switches, language selector, and bookmarks.

---

## 4. Touch Targets & Accessibility Constraints
* All interactive buttons maintain a minimum touch target height of 40px - 44px on mobile viewports.
* Form inputs (Search, Filter selects) use standard text sizes (`text-sm` or `text-base`) to prevent unwanted auto-zooming on iOS Safari.
