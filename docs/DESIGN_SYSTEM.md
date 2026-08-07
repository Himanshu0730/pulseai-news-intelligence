# PulseAI — Design System Specification & Guidelines

## 1. Overview
PulseAI is an AI News Intelligence Platform engineered for editorial clarity, rapid factual synthesis, and multi-outlet coverage analysis. The design system bridges classic newspaper typography with modern AI-native user interface patterns.

---

## 2. Typography
The visual hierarchy utilizes two distinct font families to establish a clear distinction between editorial reading matter and interactive interface controls:

* **Editorial Headlines & Reader Body (`font-editorial`)**: `Source Serif 4`, serif, Georgia. Applied to news titles, executive briefing excerpts, long-form reader content, and narrative summaries.
* **Interface Controls & Navigation (`font-ui`)**: `Plus Jakarta Sans`, sans-serif, system-ui. Applied to navigation items, badges, metadata, buttons, search bars, and tab titles.
* **Monospace Signals (`font-mono`)**: `JetBrains Mono`, `ui-monospace`. Applied to timestamps, trust percentages, RAG citations, and category counters.

### Typographic Scale
| Scale Token | Font Size | Line Height | Usage |
| :--- | :--- | :--- | :--- |
| `text-[10px]` | 10px / 0.625rem | 14px | Micro badges, category count pills, source trust metrics |
| `text-xs` | 12px / 0.75rem | 16px | Card metadata, source tags, button labels, time-ago indicators |
| `text-sm` | 14px / 0.875rem | 20px | Secondary story titles, briefing bullet points, input fields |
| `text-base` | 16px / 1.0rem | 24px | Standard card headlines, reader body text, modal titles |
| `text-lg` | 18px / 1.125rem | 28px | Hero lead subheadlines, section headings |
| `text-xl` | 20px / 1.25rem | 28px | Standard story headlines, drawer section headers |
| `text-2xl` | 24px / 1.5rem | 32px | Page titles, hero headlines |
| `text-3xl` | 30px / 1.875rem | 36px | Landing page hero statements |

---

## 3. Color System
The color palette avoids high-saturation dark gradients or artificial glowing shadows, preferring low-saturation Slate, Sky, Emerald, and Amber neutrals aligned with WCAG AA contrast standards.

### Light & Dark Palette Tokens
* **Canvas Background**:
  * Light: `bg-slate-50` (`#f8fafc`)
  * Dark: `bg-slate-950` (`#020617`)
* **Card & Surface Background**:
  * Light: `bg-white` (`#ffffff`)
  * Dark: `bg-slate-900` (`#0f172a`)
* **Subtle Surface Accent**:
  * Light: `bg-slate-100` (`#f1f5f9`) / `bg-sky-50` (`#f0f9ff`)
  * Dark: `bg-slate-800` (`#1e293b`) / `bg-sky-950` (`#082f49`)
* **Primary Text**:
  * Light: `text-slate-900` (`#0f172a`)
  * Dark: `text-slate-100` (`#f8fafc`)
* **Muted Text**:
  * Light: `text-slate-600` / `text-slate-500`
  * Dark: `text-slate-400` / `text-slate-300`
* **Brand / Accent**:
  * Light: `sky-600` (`#0284c7`) / `sky-700`
  * Dark: `sky-400` (`#38bdf8`) / `sky-500`
* **Status Indicators**:
  * Emerald (`bg-emerald-50`, `text-emerald-700`): High Trust (85%+), Confirmed Facts
  * Amber (`bg-amber-50`, `text-amber-700`): Medium Trust / Developing Velocity, Uncertainties
  * Rose (`bg-rose-50`, `text-rose-700`): Low Trust (<65%), High Misinformation Risk

---

## 4. Spacing & Rhythm
Padding and margins follow a standard 4px/8px modular scale to ensure alignment across card grids, sidebars, and reader drawers.

* **Card Inner Padding**: `p-5 sm:p-6` (20px to 24px)
* **Hero Lead Card Padding**: `p-6 sm:p-8` (24px to 32px)
* **Drawer / Modal Inner Padding**: `p-6 sm:p-10`
* **Grid Gutters**: `gap-5` (20px) or `gap-6` (24px)
* **Border Radii**:
  * Pill Controls: `rounded-full` (24px)
  * Standard Cards & Modals: `rounded-2xl` (16px)
  * Buttons & Inset Boxes: `rounded-xl` (12px)
  * Micro Badges & Tags: `rounded-md` (6px) or `rounded-lg` (8px)

---

## 5. Elevation & Borders
* **Border Treatment**: Hairline borders with subtle opacity (`border-slate-200/90` in light mode, `border-slate-800/90` in dark mode).
* **Elevation**: Soft, low-blur drop shadows (`shadow-2xs`, `shadow-xs`, `shadow-sm`) that elevate on hover without cast shadows or glowing halos.

---

## 6. Icons
All icons are imported directly from `lucide-react` with standard dimensions:
* Action Buttons: `w-3.5 h-3.5` or `w-4 h-4`
* Section & Drawer Headers: `w-5 h-5`
* Brand Logo: `w-6 h-6`

---

## 7. Motion & Micro-Interactions
* Transitions use `duration-200` or `duration-300` with `ease-in-out` curves.
* Micro-hover states scale cards subtly (`scale-[1.01]` or `scale-[1.02]`).
* Fading elements use standard CSS keyframe animations (`animate-fade-in`).

---

## 8. Accessibility Standards
* **Color Contrast**: All body text meets minimum WCAG AA ratio of 4.5:1.
* **Focus States**: High-contrast outline focus rings (`focus:ring-2 focus:ring-sky-500`) applied across interactive controls.
* **Screen Reader Support**: Semantic markup (`<header>`, `<main>`, `<article>`, `<aside>`, `<nav>`) and `aria-label` attributes on icon-only buttons.
