/**
 * Every release of this site, as data.
 *
 * GENERATED LIST, AUTHORED PROSE: `tools/sync-releases.mjs` refreshes the tag,
 * date and title from GitHub and adds releases it finds, but never overwrites a
 * `summary` — those are written by hand, because a changelog assembled from
 * commit subjects reads like it was assembled from commit subjects.
 *
 * Committed rather than fetched: this is a static site, and a visitor should
 * not need GitHub to be reachable to read what shipped.
 */

export interface Release {
  /** Git tag, e.g. "v1.8.0". */
  tag: string;
  /** ISO date the release was published. */
  date: string;
  /** The release's own headline, without the version prefix. */
  title: string;
  /** One or two sentences on what it changed and why. Authored, not generated. */
  summary: string;
  isLatest?: boolean;
}

export const RELEASES: Release[] = [
  {
    tag: "v1.9.0",
    date: "2026-08-12",
    title: "a film of the money, and a ledger of the work",
    summary: "Module 75 gained a 24-second film of where a query's money goes, rendered locally from the site's own cost model so it cannot quote a figure the pages don't. And the release history became a page: fifteen releases, each with what it changed and why, instead of a claim count being the only sign anyone still maintains this.",
    isLatest: true,
  },
  {
    tag: "v1.8.0",
    date: "2026-08-12",
    title: "the homepage gets a visual made of real numbers",
    summary: "The homepage stopped animating invented numbers. One query is now priced from the verified rate card, with the answer's share of the bill computed rather than asserted — and a unit test that fails if real prices ever stop supporting the claim.",
  },
  {
    tag: "v1.7.0",
    date: "2026-08-12",
    title: "the modules get their mechanism, their wiring, and a rail",
    summary: "All twelve modules gained a 3D mechanism built from their own step data, a wiring graph making the cross-module dependencies the prose already asserted navigable, and a section rail read from each page's own headings.",
  },
  {
    tag: "v1.6.0",
    date: "2026-08-12",
    title: "/world/ becomes navigable, and cinematic",
    summary: "The scroll world became a way into the curriculum — deep links, keyboard flight, per-room module links, progress — and got its cinematic pass: per-room camera moves, drafted scene language, a title plate.",
  },
  {
    tag: "v1.5.0",
    date: "2026-08-12",
    title: "/world/: a scroll-scrubbed camera flight, rendered locally",
    summary: "A scroll-scrubbed camera flight through the platform at /world/, rendered locally and deterministically instead of by a metered video API — which makes every seam frame-exact rather than approximately matched.",
  },
  {
    tag: "v1.4.0",
    date: "2026-08-04",
    title: "Modernist site conversion: scroll homepage + light-ground shell",
    summary: "The Modernist conversion: the scroll page became the homepage, and the shell plus the whole component layer moved onto the new light-ground design system.",
  },
  {
    tag: "v1.3.0",
    date: "2026-08-03",
    title: "Scroll-driven platform page (/platform) + homepage hero rework",
    summary: "A scroll-driven platform page, an atmospheric background layer, and a reworked hero — with the total-blocking-time regression that the atmosphere introduced hunted down and fixed in the same release.",
  },
  {
    tag: "v1.2.0",
    date: "2026-08-02",
    title: "Enterprise agent engineering redesign (homepage + site-wide)",
    summary: "The site repositioned around enterprise agent engineering: an agent-loop chapter, a 3D multi-agent constellation, an integration map, and a homepage narrative rewritten to lead with the runtime.",
  },
  {
    tag: "v1.1.6",
    date: "2026-08-02",
    title: "LangGraph agent-loop lab linked from Module 85",
    summary: "A real, runnable, CI-tested LangGraph agent-loop lab, linked from Module 85 — the loop the module describes, executable.",
  },
  {
    tag: "v1.1.5",
    date: "2026-08-02",
    title: "MCP OAuth lab now linked from Module 85",
    summary: "A real, runnable, CI-tested MCP OAuth lab, linked from Module 85 — scoped, short-lived tool credentials you can actually run.",
  },
  {
    tag: "v1.1.4",
    date: "2026-08-02",
    title: "Scroll-linked 3D camera + runnable OAuth/MCP snippets (4 clouds)",
    summary: "Runnable scoped-credential snippets for all four clouds in Module 85, plus the first genuinely scroll-linked 3D camera on the homepage.",
  },
  {
    tag: "v1.1.3",
    date: "2026-08-01",
    title: "Beginner glossary + nav-overflow fix",
    summary: "A glossary page, so a beginner meeting \"chunk\", \"rerank\" or \"trace\" for the first time has somewhere to go.",
  },
  {
    tag: "v1.1.2",
    date: "2026-08-01",
    title: "Industry-wide enterprise AI ROI research",
    summary: "An industry-wide ROI snapshot added to the case studies, for context around the individual stories.",
  },
  {
    tag: "v1.1.1",
    date: "2026-08-01",
    title: "Consolidated enterprise case-studies page",
    summary: "All 48 enterprise case studies consolidated into one page instead of being scattered across modules.",
  },
  {
    tag: "v1.1.0",
    date: "2026-08-01",
    title: "Homepage 3D scene, agent auth labs, search fix, embeddings depth",
    summary: "A 3D homepage scene, animated tool-call-injection and agent-cost demos, Matryoshka and quantization depth in Module 20, and a fix for search results rendering unstyled.",
  },
  {
    tag: "v1.0.0",
    date: "2026-08-01",
    title: "Agent dev kits, MCP auth, enterprise ROI visuals, release-gated CI/CD",
    summary: "The first release: agent dev kits, MCP auth, enterprise ROI visuals, and a release-gated deploy — nothing reaches the site without a published tag.",
  },
];

/** The most recent release, for the "what's new" line elsewhere on the site. */
export const LATEST: Release = RELEASES.find((r) => r.isLatest) ?? RELEASES[0];
