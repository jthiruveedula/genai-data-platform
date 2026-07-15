# GenAI Data Platform — Multi-Cloud & OSS Learning Suite

A single reference architecture, implementation guide, and interactive
learning site for building GenAI data platforms on **AWS**, **Azure**,
**GCP**, or **pure open-source (OSS)**. Pick a platform and the whole site —
content, code samples, diagrams, and look & feel — adapts to that flavor,
while reusing the same data, RAG, monitoring, guardrail, and cost concepts.

**Live site:** https://jthiruveedula.github.io/genai-data-platform/

See [`PLAN.md`](./PLAN.md) for the full architecture, curriculum, and
verification plan this repo implements.

## Status

This repo is in **P0/P1** of the plan: the Astro site skeleton, the
cloud-adaptive theming system (4 flavors × light/dark), the cloud selector,
and two sample modules (`00-foundations`, `10-ingestion`) are live. The full
curriculum (modules 00–90, quizzes, cost calculator, Firecrawl freshness
pipeline) ships incrementally — see the Phases table in `PLAN.md` §8.

## Repo layout

```text
config/cloud.yaml       # repo-level cloud flavor + feature flags (IaC/pipelines)
site/                   # Astro site — the learning content itself (no docs/ md tree)
  src/data/             # modules.ts (cloud-agnostic) + flavors/*.ts (per-cloud)
  src/styles/tokens/    # design tokens: base.css + aws/azure/gcp/oss.css
  src/components/       # CloudSelector, Navbar, FlavorTabs
  src/pages/modules/    # one folder per module
.github/workflows/      # CI: build & deploy site to GitHub Pages
```

## Local development

```bash
cd site
npm install
npm run dev       # http://localhost:4321
npm run build     # -> site/dist
```

## Deployment

Pushes to `main` that touch `site/**` build and deploy automatically to
GitHub Pages via `.github/workflows/deploy-site.yml`.
