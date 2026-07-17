# DESIGN.md — Cinematic Homepage Design System

This documents the Phase 3 redesign: the homepage moved from a docs-like,
text-heavy landing page to a cinematic, motion-first platform launch. It
covers the design principles, token architecture, motion system, content
hierarchy, and the cloud-aware data model that drives all of it.

## 1. Design principles

- **Control room, not classroom.** The visual language is a technical HUD —
  deep layered surfaces, hairline borders, glass panels, bracketed mono status
  chips (`[ LIKE THIS ]`) — not a whitepaper, notebook, or docs homepage.
- **Dark-first, light as an explicit fallback.** The default experience is
  dark; light mode is a fully-designed alternative activated by the theme
  toggle, not an afterthought.
- **The cloud accent is the only color driver.** No generic "AI" purple
  gradients. Each cloud flavor's brand accent (GCP blue, AWS orange, Azure
  blue, OSS green) is the single source of visual differentiation layered on
  top of a neutral dark/light surface system.
- **Every animation demonstrates the concept next to it.** Motion is not
  decoration: the hero schematic's packets show data flowing through a
  pipeline, the architecture story's rail shows a document's literal journey,
  the cost console's counters show unit economics responding to your inputs.
  If an animation doesn't teach or signal something, it doesn't ship.
- **Left-aligned, technical, information-dense where it matters.** Content
  columns are left-aligned, not centered; the design leaves room for real
  service names, real code, and real cost numbers rather than reducing
  everything to marketing copy.

## 2. Token architecture

Three layers, enforced by convention (`site/src/styles/tokens/`):

```
primitive  →  semantic  →  component
(base.css)    (base.css,     (component.css)
              aws/azure/
              gcp/oss.css)
```

Components must never reference a raw hex value — only semantic custom
properties (`--bg`, `--accent`, `--text-secondary`, etc.).

### Dark-first convention

- `:root` in `base.css` defines the **dark** surface scale by default — this
  is what renders with no `data-theme` attribute at all.
- `:root[data-theme="light"]` is the explicit light-mode override.
- Each cloud file (`aws.css`, `azure.css`, `gcp.css`, `oss.css`) follows the
  same shape: `:root[data-cloud="X"]` sets that flavor's **dark** surfaces;
  `:root[data-cloud="X"][data-theme="light"]` sets its light fallback.
- `BaseLayout.astro`'s inline theme-init script resolves `localStorage` (or
  defaults to `"dark"`) before first paint, so there's no flash of the wrong
  theme.

### Surface scale

| Token | Role |
|---|---|
| `--bg-deep` | Deepest background — hero vignette, alternating section bands |
| `--bg` | Page background |
| `--bg-card` | Raised card / panel surface |
| `--bg-raised` | Hover / active surface, one step brighter than `--bg-card` |
| `--border` | Hairline borders |
| `--text` / `--text-secondary` | Primary / secondary text |
| `--accent` / `--accent-2` / `--accent-text` | Cloud (or neutral) accent, secondary accent, accent tuned for text/link contrast |

### Glass tokens

`--glass-bg`, `--glass-border`, `--glass-blur`, `--shadow-panel` back the
shared `.glass-panel` utility class used throughout the homepage (navbar,
hero switcher, flavor deck panels, cost console frame).

### Per-cloud personality table

| Cloud | Accent (dark) | Radius | Heading font | View-transition timing |
|---|---|---|---|---|
| GCP ("Material") | `#4285f4` | 16px, pill buttons | Inter | 320ms, Material standard ease |
| AWS ("Console") | `#ff9900` | 2px, boxy | Inter | 200ms, brisk near-linear |
| Azure ("Fluent") | `#0078d4` | 8px, acrylic blur | Inter | 380ms, gentle ease-out |
| OSS ("Hacker") | `#22c55e` | 2px, scanline texture | JetBrains Mono | 150ms, linear |

View-transition durations/easings are read from `--vt-duration`/`--vt-ease`
by `transitions.css`, which targets Astro's native
`::view-transition-old(root)` / `::view-transition-new(root)` pseudo-elements
on same-origin `<ClientRouter />` navigations.

## 3. Motion system

### Duration tokens

| Token | Value | Use for |
|---|---|---|
| `--duration-micro` | 175ms | Hover, focus, chip/button state changes |
| `--duration-theme` | 250ms | Theme/cloud crossfades (background, color, border) |
| `--duration-scene` | 600ms | Larger one-off scene transitions |

### Motion primitives (`src/lib/motion/primitives.ts`)

| Function | Use |
|---|---|
| `fadeIn(el, opts?)` | One-off fade + rise entrance |
| `stagger(els, opts?)` | Staggered group entrance (cards, list items) |
| `scrollReveal(el, opts?)` | Scroll-triggered fade + rise, fires once |
| `magneticHover(el, strength?, opts?)` | Cursor-following nudge on hover; returns a cleanup fn |
| `shimmer(el, opts?)` | Looping background-position sweep (skeletons, highlights) |
| `countUp(el, target, opts?)` | Animate a numeric counter into `el`'s text (prefix/suffix/decimals/locale) |
| `drawPath(path, opts?)` | SVG stroke-draw reveal via `strokeDasharray`/`strokeDashoffset` |

Every primitive checks reduced motion itself and either no-ops to the final
visible state or (for `countUp`/`drawPath`) writes the final value/state
immediately with no tween created.

### The `gsap.matchMedia()` footgun

**Never use** `gsap.matchMedia().add({ name: query }, callback)` for a
reduced-motion branch. Verified against the installed gsap 3.15.0: a named
condition's callback only fires when that condition currently evaluates
`true`. Since most visitors have *no* reduced-motion preference, the
`"(prefers-reduced-motion: reduce)"` condition is `false` for them — and its
callback silently never runs at all, taking the entire animation setup
(including the reduced-motion branch itself) down with it.

**Always use** a plain boolean check instead:

```ts
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduced) { /* set final state */ return; }
/* ...animate... */
```

### Scroll-storytelling rules

- At most **one pinned, scroll-scrubbed scene per page** (the homepage's
  Architecture Story). Stacking multiple pins fights the user's scroll input
  and tanks performance.
- Use `scrub: 1` (not `scrub: true`) for a slight, natural lag rather than a
  rigid 1:1 lock.
- Each stage in a scrubbed sequence should dwell for **at least ~10%** of the
  scroll range — shorter and text becomes unreadable mid-scroll.
- **Disable pinning below 768px** and under reduced motion; fall back to a
  plain vertical list with individual `scrollReveal`-style triggers instead.
  ArchitectureStory re-evaluates this on resize (debounced) and tears down /
  rebuilds via `gsap.context().revert()` if the pin/list boundary is crossed.

### Astro `<ClientRouter>` lifecycle pattern

Because `<ClientRouter />` swaps the DOM in place rather than doing a full
reload, a component's `<script>` module runs once and is *not* re-executed on
navigation — only the `astro:page-load` event fires again. Every homepage
component follows the same pattern to avoid leaking GSAP contexts/
ScrollTriggers onto detached nodes:

```ts
let ctx: gsap.Context | undefined;

function setup() {
  const rootEl = document.querySelector<HTMLElement>("[data-my-scene]");
  if (!rootEl) return;
  ctx?.revert();
  ctx = gsap.context(() => { /* all tweens/ScrollTriggers/listeners */ }, rootEl);
}

setup();
document.addEventListener("astro:page-load", setup);
document.addEventListener("astro:after-swap", () => ctx?.revert());
```

`BaseLayout.astro` additionally kills all remaining `ScrollTrigger` instances
on `astro:after-swap` as a backstop.

### Reduced-motion policy

- Static final frame, fully visible, no entrance/loop/parallax.
- Interactive elements (cost console sliders, cloud switcher) remain **fully
  functional** — reduced motion removes animation, never removes capability.
- Ambient ScrollTrigger reveals become instant `gsap.set(...)` calls instead
  of `gsap.from(...)` tweens.

## 4. Content / UX hierarchy

The homepage is a seven-scene narrative arc, each scene owning one job:

| # | Scene | Job |
|---|---|---|
| 1 | **HeroScene** | First-screen wow: the living architecture schematic, cloud switcher, trusted-concepts row |
| 2 | **ArchitectureStory** | Teach the full 10-stage document lifecycle via a pinned, scroll-scrubbed sequence |
| 3 | **CloudFlavorDeck** | Let the visitor pick a stack; show each cloud's personality, not just a feature list |
| 4 | **CurriculumJourney** | Present modules as a mission progression (spine + nodes), not a bullet list |
| 5 | **CostConsole** | Make unit economics feel like operating a real console, tied to the active cloud |
| 6 | **WhyItMatters** | Audience + outcomes as layered proof panels + a stat strip, not paragraphs |
| 7 | **FinalCTA** | Cinematic close: ambient drift, word-reveal statement, dual CTA |

Sections alternate `--bg` / `--bg-deep` with hairline top/bottom borders
(ArchitectureStory, WhyItMatters, FinalCTA use `--bg-deep`) so the page has
visual rhythm without introducing new colors.

## 5. Cloud-aware data model

`src/data/platform.ts` is the single source of truth for everything that
re-maps when the visitor switches clouds:

- **`LIFECYCLE`** — the 10 pipeline stages (`sources` → `answer`), each with a
  `services: { neutral, gcp, aws, azure, oss }` label map. Feeds the hero
  schematic's node-service overlays and the entire ArchitectureStory sequence.
- **`PERSONALITIES`** — one entry per cloud (archetype, thesis, stack list,
  signal line) for `CloudFlavorDeck`.
- **`COST_SCENARIOS`** — preset slider values (`pilot` / `production` /
  `scale`) for `CostConsole`'s scenario buttons.
- **`OUTCOMES`** — the three proof panels for `WhyItMatters`.
- **`CONCEPTS`** — the "you will master" chip row in the hero.

### The `.cloud-swap` CSS mechanism

Any place that needs a cloud-specific label renders **all five** variants in
markup and lets CSS show only the active one — zero JS, survives Astro view
transitions:

```html
<span class="cloud-swap">
  <span data-for="neutral">Vector index</span>
  <span data-for="gcp">Vertex AI Vector Search</span>
  <span data-for="aws">OpenSearch Serverless</span>
  <span data-for="azure">Azure AI Search</span>
  <span data-for="oss">Qdrant</span>
</span>
```

`base.css` shows only the `[data-for]` matching `<html data-cloud>` (or
`neutral` when unset).

### The cloud-switch event contract

Any `<button type="button" data-cloud-btn="gcp" aria-pressed="false">` in the
initial DOM is auto-bound by `Navbar.astro`'s global script: clicking it sets
`<html data-cloud>`, `localStorage`, the `?cloud=` URL param, `aria-pressed`
on every matching button site-wide, and dispatches a `document` `CustomEvent`
named **`gdp:cloud-change`** with `detail.cloud`. Components never need their
own click handlers for cloud selection — they only listen for
`gdp:cloud-change` to add an *animated* beat on top of the CSS-only label
swap (e.g. a brief opacity dip/restore on the affected labels), so the
switch feels alive rather than a hard cut.

## 6. How this differs from the docs-like version

| Before (docs-like) | After (cinematic) |
|---|---|
| Centered text hero, static cloud-card grid | Full-viewport hero: left-aligned copy + a living, animated architecture schematic on a canvas column |
| Curriculum rendered as a plain `<ul>` of links | Mission-progression spine with numbered cards, lane chips, and locked "coming soon" entries |
| Plain calculator card with instant number updates | Operations-console frame with scenario presets, animated counters, and an active-stack highlight |
| Cloud switch = instant text/color swap | Cloud switch pulses affected labels/nodes so the re-map reads as a live event, not a page reload |
| Light-mode-default, neutral palette until a cloud is picked | Dark-first "control room" surface by default; light mode is a fully designed fallback |
| No dedicated architecture narrative — service names lived in flavor tables only | A pinned, scroll-scrubbed 10-stage story turns the same data into a guided lifecycle walkthrough |
| Sections had no motion system — ad-hoc inline GSAP per component | Shared motion primitives (`countUp`, `drawPath`, `scrollReveal`, …) and one documented reduced-motion/ClientRouter pattern used everywhere |
| "Docs homepage" visual tone | Bracketed mono status-chip vocabulary, glass panels, hairline HUD dressing throughout |
