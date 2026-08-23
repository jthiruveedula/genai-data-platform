# GenAI Data Platform — Multi-Cloud & OSS Learning Suite

[![CI](https://github.com/jthiruveedula/genai-data-platform/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/jthiruveedula/genai-data-platform/actions/workflows/ci.yml)
[![Deploy](https://github.com/jthiruveedula/genai-data-platform/actions/workflows/deploy-site.yml/badge.svg)](https://github.com/jthiruveedula/genai-data-platform/actions/workflows/deploy-site.yml)
[![Release](https://img.shields.io/github/v/release/jthiruveedula/genai-data-platform?label=release)](https://github.com/jthiruveedula/genai-data-platform/releases)
[![Claims verified](https://img.shields.io/badge/claims-52%2F52%20sourced-brightgreen)](https://jthiruveedula.github.io/genai-data-platform/freshness/)

One CI run gates everything below and every deploy: unit tests, the site
build, a [lychee](https://github.com/lycheeverse/lychee) link check over the
built HTML, Playwright end-to-end plus `axe-core` accessibility tests, the
claim-registry coverage check, and Lighthouse CI budgets. Deploys
(`deploy-site.yml`) run only on a tagged release and only after that build
job has succeeded.

A single reference architecture, implementation guide, and interactive
learning site for building GenAI data platforms on **AWS**, **Azure**,
**GCP**, or **pure open-source (OSS)**. Pick a platform and the whole site —
content, code samples, diagrams, and look & feel — adapts to that flavor,
while reusing the same data, RAG, monitoring, guardrail, and cost concepts.

**Live site:** https://jthiruveedula.github.io/genai-data-platform/

See [`PLAN.md`](./PLAN.md) for the full architecture, curriculum, and
verification plan this repo implements.

## Status

All twelve curriculum modules (`00-foundations` → `85-agents`) are live, each
with four flavor tabs, a worked scenario, pitfalls, a recap, and a
builds-on / used-by wiring graph. Alongside them: the service matrix,
the cost console, case studies, the glossary, three learning paths, and the
freshness registry — 52 of 52 factual claims traced to a dated primary
source. See the Phases table in `PLAN.md` §8 for what remains.

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

Merging a PR to `main` does **not** deploy by itself — `main` can carry
several merged, CI-passed PRs ahead of what's actually live. Deploys are
gated behind a GitHub Release:

1. Merge whatever PRs are ready (each already passed CI on its own branch).
2. Cut a release once you're ready to ship what's on `main`:
   ```bash
   gh release create v1.4.0 --target main --generate-notes
   ```
3. Publishing that release triggers `.github/workflows/deploy-site.yml`,
   which builds `site/` at that tag and deploys it to GitHub Pages.

`workflow_dispatch` on `deploy-site.yml` re-runs a deploy of whatever's
already checked out (e.g. retrying a flaky Pages upload) — it does not ship
unreleased `main`.

**Rollback:** if a live release has a problem, run
`.github/workflows/rollback-site.yml` (Actions tab → Run workflow) with the
`tag` input set to a previous release tag (see `gh release list`). It
rebuilds and redeploys that exact tag to Pages without cutting a new
release.
