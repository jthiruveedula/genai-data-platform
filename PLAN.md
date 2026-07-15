# GenAI Data Platform — Multi‑Cloud & OSS Learning Suite

> **Goal:** A single reference architecture, implementation guide, and interactive learning site for building GenAI data platforms on **AWS**, **Azure**, **GCP**, or **pure open‑source (OSS)**.
> Users select their target platform and the entire site — content, code samples, diagrams, and **look & feel** — adapts to that flavor, while reusing the same data, RAG, monitoring, guardrail, and cost concepts.
>
> **Hosting:** GitHub Pages (static site, no backend). All interactivity is client‑side.
> **Freshness:** All cloud service facts are validated on a schedule via **Firecrawl** (see §9).

---

## 0. Cloud / Stack Selector

At setup time (repo) and at browse time (site), the user chooses one of:

- `cloud = "gcp"`
- `cloud = "aws"`
- `cloud = "azure"`
- `cloud = "oss"` (Kubernetes + OSS stack)

The repo exposes:

- `config/cloud.yaml`:
  - `cloud: gcp | aws | azure | oss`
  - `region`, `project_id` / `account_id` / `subscription_id`
  - feature flags: `use_document_ai_ocr`, `use_managed_vector_db`, `use_managed_rag_engine`, `use_hybrid_search`, `use_reranker`, `enable_guardrails`, `enable_cost_dashboard`
- Per‑cloud subfolders with IaC (Terraform), pipelines, examples, and default LLM/vector configurations.

The **site** persists the selection in `localStorage` (`gdp.cloud`) and reflects it in the URL (`?cloud=aws`) so links are shareable and deep‑linkable. See §7 for the full frontend behavior.

---

## 1. Core Architecture (Cloud‑Agnostic)

Regardless of cloud:

1. **Ingestion**: pull data from docs, tickets, chats, DBs, web (e.g., crawl4ai / Firecrawl) into object storage + tables.
2. **Parsing/OCR/Chunking**: transform unstructured content into structured chunks with metadata.
3. **Embeddings & Vector Store**: generate embeddings and store them with metadata in a vector index.
4. **Serving (RAG / Agents)**: APIs/agents that retrieve chunks, construct prompts, call LLMs (fast vs reasoning), return citations.
5. **Monitoring & Event Log**: capture every request, retrieval, response, and cost.
6. **Prompt Analytics & Evaluation**: cluster intents, detect failure modes, run LLM‑judge and A/B tests.
7. **Guardrails**: pre/post‑LLM checks for input/output safety and policy enforcement.
8. **Cost & Capacity Modeling**: estimate and monitor cost across LLM tokens, compute, storage, and network.
9. **Infra & Governance**: IaC, RBAC, audit, multi‑env.

Cross‑cutting layers (added — previously missing):

10. **Data Quality & Contracts**: schema validation (Great Expectations / Pandera / dbt tests), dedup, PII detection & redaction before embedding.
11. **Orchestration**: pipeline scheduling and backfills (Airflow / Step Functions / Cloud Composer / Data Factory), idempotent re‑ingestion, incremental sync.
12. **Security & Identity**: secrets management, per‑tenant data isolation, document‑level ACLs propagated into retrieval filters, encryption at rest/in transit.
13. **CI/CD & Environments**: dev/stage/prod promotion, IaC plan/apply gates, eval‑gated deploys (a model/prompt change must pass evals before promotion).
14. **Retrieval Quality**: hybrid search (BM25 + vector), reranking, query rewriting, metadata filtering — treated as a first‑class stage, not an afterthought.
15. **Caching & Latency**: semantic caching of frequent queries, prompt caching, streaming responses.

All clouds implement this same flow with their own primitives.

---

## 2. Per‑Cloud “Flavor” Overview

> ⚠️ Every service claim in this section is subject to the Firecrawl validation pipeline (§9). Items marked `[verify]` are fast‑moving and must be re‑checked before each content release.

### 2.1 GCP Flavor (`cloud = "gcp"`)

- **Ingestion**: Dataflow (Beam) and Dataproc (Spark) from Pub/Sub, DBs, APIs into **Cloud Storage** and **BigQuery**. Web: crawl4ai/Firecrawl jobs on Cloud Run / GKE → GCS.
- **Parsing & OCR**: **Document AI** (Layout Parser) for PDFs/images → BigQuery tables with structured text and layout.
- **Embeddings & Vector Store**: Vertex AI embeddings (via BigQuery ML remote models or direct API); **Vertex AI Vector Search / RAG Engine** `[verify]`; BigQuery native `VECTOR_SEARCH` for analytical RAG `[verify]`.
- **Serving**: Cloud Run app or Vertex AI Agent Builder; **Gemini Flash** for fast queries, **Gemini Pro / reasoning tiers** for complex tasks `[verify: model names/tiers]`.
- **Orchestration**: Cloud Composer (Airflow) or Workflows.
- **Monitoring**: BigQuery “GenAI event log” + Cloud Monitoring dashboards; Vertex AI model monitoring.
- **Guardrails**: Vertex AI safety filters + Model Armor `[verify]` + Cloud Run middleware for pre/post checks.
- **Security**: IAM + VPC‑SC perimeters, CMEK, Secret Manager, DLP API for PII redaction.
- **Cost**: Vertex AI + BigQuery + GCS estimation; billing export → BigQuery FinOps dashboard.

### 2.2 AWS Flavor (`cloud = "aws"`)

- **Ingestion**: Glue, Lambda, Kinesis, Step Functions into **S3**, optionally **Athena/Redshift**. Web: crawl4ai on ECS Fargate / Lambda → S3.
- **Parsing & OCR**: Textract / Comprehend / custom Lambda parsers → S3 + Athena/Redshift tables; Bedrock Data Automation for multimodal parsing `[verify]`.
- **Embeddings & Vector Store**: **Amazon Bedrock** (Titan / Cohere embeddings) `[verify: current embedding models]`. Vector store options: **OpenSearch Service/Serverless**, **Aurora Postgres + pgvector**, **S3 Vectors** `[verify: GA status]`.
- **Serving**: Bedrock Knowledge Bases (managed RAG) or custom API Gateway + Lambda/Fargate RAG API calling **Anthropic Claude** on Bedrock; Bedrock Agents for tool use `[verify: model availability by region]`.
- **Orchestration**: Step Functions / MWAA (managed Airflow).
- **Monitoring**: CloudWatch logs/metrics + Athena/QuickSight event‑log dashboards; Bedrock invocation logging.
- **Guardrails**: **Bedrock Guardrails** (content filters, denied topics, PII masking, contextual grounding checks) `[verify]` + custom middleware.
- **Security**: IAM, KMS, Secrets Manager, Macie for PII discovery, VPC endpoints for Bedrock.
- **Cost**: Bedrock token pricing + S3 + OpenSearch + compute; Cost Explorer / CUR → Athena FinOps queries.

### 2.3 Azure Flavor (`cloud = "azure"`)

- **Ingestion**: Data Factory, Fabric / Synapse, Functions into **Blob Storage / ADLS Gen2** and **Azure SQL / Fabric Lakehouse**. Web: crawl4ai on Container Apps / AKS → Blob.
- **Parsing & OCR**: **Azure AI Document Intelligence** (layout, prebuilt & custom models).
- **Embeddings & Vector Store**: **Azure OpenAI** embeddings `[verify: model names]`; **Azure AI Search** with hybrid keyword+vector+semantic ranking; integrated vectorization pipelines `[verify]`.
- **Serving**: Azure OpenAI endpoints + Functions/Container Apps orchestrating RAG; **Azure AI Foundry** (agents, prompt flow, evaluations) `[verify: Foundry naming — rebranded from AI Studio]`.
- **Orchestration**: Data Factory pipelines / Fabric pipelines / Durable Functions.
- **Monitoring**: Azure Monitor + Log Analytics + Application Insights; event logs in Azure Data Explorer/SQL.
- **Guardrails**: **Azure AI Content Safety** (text/image moderation, prompt shields, groundedness detection) `[verify]`.
- **Security**: Entra ID, Key Vault, Private Endpoints, Purview for governance & PII classification.
- **Cost**: Azure OpenAI PTU vs pay‑as‑you‑go `[verify]`, Search tiers, storage/compute via Cost Management.

### 2.4 OSS Flavor (`cloud = "oss"`)

- **Ingestion**: Airflow / Prefect / Dagster / Beam into **MinIO (S3‑compatible)** and **Postgres / ClickHouse**. Web: crawl4ai on K8s workers → MinIO.
- **Parsing & OCR**: Tesseract, Apache Tika, PDFPlumber, **Docling**, **unstructured.io**, trafilatura/BeautifulSoup for HTML.
- **Embeddings & Vector Store**: HF models (BGE / E5 / GTE / nomic‑embed) served via **TEI (Text Embeddings Inference)** or ONNX. Vector DB: Qdrant, Milvus, Weaviate, pgvector, **LanceDB**.
- **Serving**: FastAPI / Node backends on K8s; **vLLM / Ollama / llama.cpp** serving open‑weight models (Llama, Mistral, Qwen) `[verify: current best open models]`, or external APIs; LiteLLM as a unified gateway.
- **Orchestration**: Airflow / Dagster on K8s; Argo Workflows.
- **Monitoring**: Prometheus + Grafana; event log in Postgres/ClickHouse; **Langfuse / OpenLLMetry / Phoenix (Arize)** for LLM tracing.
- **Guardrails**: **NeMo Guardrails / Guardrails AI / Llama Guard**, Presidio for PII, custom heuristics in middleware.
- **Security**: Keycloak/OIDC, Vault for secrets, NetworkPolicies, per‑namespace tenancy.
- **Cost**: GPU hours, disks, power + any external API usage; OpenCost on K8s.

---

## 3. Learning Content & Curriculum (expanded)

Each `cloud` flavor presents three **paths**, now with explicit learning artifacts per module — not just docs.

### 3.1 Path definitions

- **Beginner (Weeks 1–2):** one data source (PDFs or a simple crawl) → one embedding model → one fast LLM → simple RAG API → event log table. Outcome: a working single‑source RAG with citations.
- **Intermediate (Weeks 3–5):** multiple sources (docs + tickets + chats), hybrid retrieval + reranking, role‑aware retrieval, basic guardrails, A/B tests on prompts/models, first eval suite. Outcome: production‑shaped pipeline with quality gates.
- **Advanced (Weeks 6–8):** multi‑tenant, multi‑region; hybrid/multi‑cloud (e.g., data on AWS, inference on GCP, governance on Azure); continuous evaluation; advanced guardrails; cost dashboards; agentic workflows. Outcome: platform‑grade deployment.

### 3.2 Per‑module learning artifacts (applies to every module in every path)

Each module ships with (all rendered as **site pages/components — no standalone .md deliverables**):

1. **Concept page** — cloud‑agnostic explanation with a diagram (Mermaid, theme‑aware).
2. **Flavor tabs** — the same task shown in all four flavors; the site auto‑selects the active flavor's tab.
3. **Hands‑on lab** — copy‑paste runnable steps with expected output, estimated time, and estimated cloud cost (e.g., "~$0.40 in Bedrock tokens").
4. **Checkpoint quiz** — 5–8 questions, client‑side JS, scored locally, progress saved to `localStorage`.
5. **Pitfalls & anti‑patterns** — common failure modes (chunk size extremes, missing metadata filters, embedding model/query mismatch, unbounded context stuffing).
6. **Cost note** — what this module costs to run per flavor.
7. **Cleanup script** — teardown for every lab (critical for learner cloud bills).
8. **Further reading** — validated external links (see §9; links carry a `data-verified` date badge).

### 3.3 Missing curriculum pieces (now added)

- **Module 00 — Foundations:** tokens, embeddings intuition, vector similarity, context windows, RAG vs fine‑tuning vs long‑context; glossary (site‑wide hover tooltips).
- **Module 15 — Chunking deep dive:** fixed vs recursive vs semantic vs layout‑aware chunking; parent‑document and sentence‑window retrieval; chunking evaluation.
- **Module 35 — Retrieval quality:** hybrid search, rerankers (cross‑encoders), query expansion/rewriting, HyDE, metadata filtering, recall/precision measurement with a labeled set.
- **Module 45 — Evaluation:** golden datasets, RAGAS‑style metrics (faithfulness, answer relevance, context precision/recall), LLM‑as‑judge calibration, regression evals in CI.
- **Module 55 — Observability for LLMs:** traces/spans for RAG (query → retrieval → prompt → completion), token accounting per request, latency budgets (TTFT vs total).
- **Module 65 — Security for GenAI:** prompt injection (direct/indirect), data exfiltration via retrieval, jailbreaks, output handling (XSS from LLM output), OWASP LLM Top 10 mapping.
- **Module 75 — FinOps for GenAI:** unit economics ($/query, $/tenant), caching strategies, model routing (fast→reasoning escalation), capacity planning worksheets (interactive calculator on the site).
- **Module 85 — Agents & tool use:** function calling, MCP, agent loops, when RAG beats agents and vice versa.
- **Capstone (per path):** Beginner — "Ask‑your‑PDFs" bot. Intermediate — internal support copilot over docs+tickets. Advanced — multi‑tenant knowledge platform with eval‑gated deploys. Each capstone has a rubric and a self‑assessment checklist.

---

## 4. Repo Layout

```text
genai-data-platform/
  config/
    cloud.yaml                 # cloud = gcp|aws|azure|oss and feature flags
  ingestion/        {gcp,aws,azure,oss}/
  parsing/          {gcp,aws,azure,oss}/
  embeddings/       {gcp,aws,azure,oss}/
  retrieval/        {gcp,aws,azure,oss}/     # NEW: hybrid search, rerankers
  serving/          {gcp,aws,azure,oss}/
  evaluation/       {gcp,aws,azure,oss}/     # NEW: golden sets, RAGAS, CI evals
  monitoring/       {gcp,aws,azure,oss}/
  analytics/        {gcp,aws,azure,oss}/
  guardrails/       {gcp,aws,azure,oss}/
  cost/             {gcp,aws,azure,oss}/
  security/         {gcp,aws,azure,oss}/     # NEW: PII, ACL retrieval filters
  orchestration/    {gcp,aws,azure,oss}/     # NEW: DAGs, schedules, backfills
  infra/
    terraform/      {gcp,aws,azure,oss}/
    cicd/                                      # GH Actions: deploy site, run evals, validate links
  site/                                        # GitHub Pages frontend = THE content (no docs/ md tree)
    src/
      styles/tokens/                           # base.css, aws.css, azure.css, gcp.css, oss.css
      components/                              # CloudSelector, FlavorTabs, ArchDiagram, Quiz, CostCalc
      data/                                    # modules.ts, flavors/{gcp,aws,azure,oss}.ts, pricing.json
      pages/
        index.astro                            # cloud selector hero + curriculum
        modules/                               # 00-foundations … 90-glossary (see module list §3.3)
        paths/{beginner,intermediate,advanced} # per-path pages incl. vertical slices + capstones
        matrix.astro                           # service-equivalence matrix
        freshness.astro                        # rendered validation report
    public/logos/                              # official brand SVGs + LICENSES.md
  validation/                                  # Firecrawl freshness pipeline (see §9)
    sources.yaml                               # claim → authoritative URL map
    checks/                                    # per-claim extraction schemas
    reports/                                   # dated validation reports (committed)
```

**Content model (no markdown files):** all learning content is authored as structured data + Astro components. Cloud‑agnostic concept copy lives once per module in `data/modules.ts`; flavor‑specific bits (service names, code snippets, lab steps, costs) live in `data/flavors/*.ts` keyed by module id. Pages render `concept + flavors[activeCloud]`, so adding a module or a flavor is a data change, not a page rewrite — and the FlavorTabs/diagrams/badges all read from the same source.

---

## 5. Vertical Slice Templates (Per Cloud)

Each flavor gets its own “vertical slice” doc; steps are identical, primitives swap:

1. Pick data source (PDFs, DB, web via crawl4ai/Firecrawl).
2. Ingest to cloud storage + base tables.
3. Parse/OCR, chunk, enrich metadata.
4. Embed + store in vector index.
5. Build RAG API (fast model first; optional reasoning model escalation).
6. Log events, build one dashboard.
7. Add one guardrail (input or output).
8. Run one simple cost estimator.
9. **Run the module eval** (new): 20 golden Q&A pairs must score ≥ threshold before "slice complete."
10. **Teardown** (new): run the cleanup script; verify $0 idle spend.

Each slice is a **site page** rendered from the shared checklist + the active flavor's data — the GCP view swaps Vertex AI + Document AI + BigQuery for Bedrock + Textract + OpenSearch in the AWS view, etc., from the same template.

---

## 6. Frontend Stack Decision (GitHub Pages)

**Recommendation: Astro** (static output, islands for interactive components, zero JS by default → fast pages; content authored as structured data + components per §4, not markdown files). Alternatives considered: Docusaurus (heavier React runtime, harder full‑theme swaps), VitePress (Vue, weaker fit for our data‑driven flavor components), MkDocs Material (markdown‑centric — wrong fit since we're not writing md).

- Build: `astro build` → `dist/` → deployed by GitHub Actions to `gh-pages` (or Pages artifact flow).
- Base path configured for `https://<user>.github.io/genai-data-platform/`.
- Search: Pagefind (static, client‑side, works on Pages).
- Diagrams: Mermaid with per‑theme variable overrides so diagrams recolor with the flavor.
- No backend: quizzes, progress, calculators, and the cloud selector are all client‑side.

---

## 7. Frontend Look & Feel — Cloud‑Adaptive Theming

The signature feature: **selecting a cloud re‑skins the entire site** — palette, accents, logos, hero art, code‑block styling, diagram colors — while content structure stays identical.

### 7.0 Design language & story (reference: firecrawl.dev — scraped & analyzed)

Firecrawl.dev's signature, verified by scrape: warm near‑white canvas (`#F9F9F9`/`#FDFDFD`), hairline borders (`#E8E8E8`), one hot accent (`#FA5D19`), gray‑muted secondary text (`#727272`), bracketed monospace status chips (`[ 200 OK ] [ .JSON ] [ SCRAPE ] [ .MD ]`), 150–200ms micro‑interactions — and crucially, a **hero where the animation IS the product**: scrambled raw bytes visibly resolving into clean JSON while "Scraping…" runs. We adopt that philosophy: *clean, light, technical-futuristic surface; every animation demonstrates the concept it sits next to.* Nothing moves for decoration.

**The site's story arc — "Follow one document through the platform."** A single sample document (a messy PDF page) is the protagonist. It appears in the hero and travels through every module:

1. **Hero (landing):** the document streams in as raw glyph‑noise and resolves — stage by stage — through animated pipeline chips `[ INGEST ] → [ PARSE ] → [ CHUNK ] → [ EMBED ] → [ RETRIEVE ] → [ ANSWER ]`, ending as a chat answer with a glowing citation back to the original page. Selecting a cloud recolors the pipeline and swaps each stage's service icon (S3/Blob/GCS/MinIO…) live — the selector itself teaches the service‑equivalence mapping.
2. **Module pages:** each opens with a small scroll‑driven scene of the same document at that stage, and the animation is the lesson:
   - *Ingestion:* files fly from source icons (web, DB, tickets) into the storage bucket node; failed/duplicate files bounce off with a `[ 409 DUP ]` chip (teaches idempotency).
   - *Chunking:* the paragraph visibly splits at semantic boundaries; a slider lets the learner drag chunk size and watch overlap/orphaned‑context artifacts appear (interactive island, not video).
   - *Embeddings:* chunk text collapses into a point that flies into a 2D projected vector space; semantically similar chunks cluster and glow together.
   - *Retrieval:* a query point drops into that same space; nearest neighbors pulse and get drawn out, reranker reorders them with a 200ms shuffle.
   - *Guardrails:* a malicious prompt chip approaches the pipeline and is caught by a scanline gate — `[ BLOCKED: PII ]` — while a clean one passes.
   - *Monitoring/cost:* each hero pipeline run increments a live token/cost ticker (tabular figures), teaching unit economics ambiently.
3. **Status‑chip vocabulary:** the bracketed monospace chip is the site‑wide motif — quiz results (`[ PASS 7/8 ]`), freshness badges (`[ ✓ VERIFIED JUL 2026 ]`), lab steps (`[ ~$0.40 ]`, `[ 12 MIN ]`), teardown confirmation (`[ $0 IDLE ]`). One visual language ties learning artifacts to the futuristic-terminal aesthetic.

Implementation: hero pipeline + vector‑space scenes as lightweight SVG/canvas islands animated with GSAP timelines + ScrollTrigger (scrubbed to scroll so the learner controls pacing); text‑resolve effect via ScrambleText‑style glyph cycling. Every scene has a static final frame as its no‑JS/reduced‑motion fallback, and a one‑line caption stating what the scene demonstrates (the story must survive with motion off).

### 7.1 Theme architecture

- All styling flows through **CSS custom properties** (design tokens). The `<html>` element carries `data-cloud="aws|azure|gcp|oss"` and `data-theme="light|dark"`.
- Token layers: `primitive → semantic → component`. Only the semantic layer changes per cloud; components never reference raw hex.
- Theme switch is instant (CSS variable swap, no reload), animated with a 250ms crossfade on `background-color`, `color`, `border-color` (respecting `prefers-reduced-motion`).
- Selection persists to `localStorage` and syncs to `?cloud=` URL param; first‑visit default is a **neutral theme** with a prominent selector hero.

### 7.2 Per‑cloud design tokens

Base surface (all clouds, light mode) follows the firecrawl.dev recipe — near‑white `#F9F9F9` canvas, `#FDFDFD` cards, 1px `#E8E8E8` hairline borders, `#727272` secondary text — so the per‑cloud accent and personality carry the differentiation:

| Token | AWS | Azure | GCP | OSS |
|---|---|---|---|---|
| `--accent` | `#FF9900` (Amazon orange) | `#0078D4` (Azure blue) | `#4285F4` (Google blue) | `#22C55E` (terminal green) |
| `--accent-2` | `#EC7211` | `#50E6FF` (cyan) | rotating `#EA4335`/`#FBBC04`/`#34A853` for category icons | `#A3E635` (lime) |
| Light `--bg` | `#FFFFFF` warm‑tinted | `#F5F9FF` cool‑tinted | `#FFFFFF` pure | `#FAFAF9` paper |
| Dark `--bg` | `#161E2D` (console squid ink) | `#1B1A19` → `#243A5E` gradients | `#202124` | `#0D1117` (GitHub dark) |
| Personality | "Console": dense, boxy, 2px radius, utilitarian | "Fluent": soft 8px radius, acrylic blur panels, depth shadows | "Material": 16px radius cards, elevation levels, pill buttons | "Hacker": monospace‑forward, 0–2px radius, 1px borders, scanline hero |
| Heading font | Amazon Ember fallback → `Inter` | Segoe UI fallback → `Inter` | Google Sans fallback → `Inter` | `JetBrains Mono` |
| Code block | dark navy w/ orange line highlights | dark w/ blue highlights | dark w/ blue/green highlights | green‑on‑black terminal w/ blinking‑cursor affordance |

Shared base typography: **IBM Plex Sans** body / **JetBrains Mono** code (self‑hosted via `@fontsource`, `font-display: swap`); brand‑evoking heading fonts are *fallback stacks only* — never bundle proprietary fonts (Amazon Ember, Segoe, Google Sans are not redistributable).

All accent-on-background pairs must pass **WCAG 4.5:1** for text (e.g., AWS orange fails on white for body text → use it for borders/fills only; text links use a darkened `#B25E00` variant). Each cloud theme ships a light **and** dark variant, tested independently.

### 7.3 Logos & brand assets (legal)

- Use **official SVG logos** only for identifying the platform (nominative use): AWS smile, Microsoft Azure, Google Cloud, plus OSS project marks (Kubernetes, PostgreSQL, Qdrant, etc.) per each project's brand guidelines.
- Store in `site/public/logos/` with a `LICENSES.md` noting the source and guideline URL for each mark; never recolor, distort, or imply endorsement ("Not affiliated with…" footer line).
- Service icons: use each provider's official architecture‑icon sets (AWS Architecture Icons, Azure architecture icons, Google Cloud product icons — all freely downloadable for architecture diagrams) `[verify: current icon-set download URLs via Firecrawl]`.
- OSS flavor uses Lucide icons + project logos. **No emoji as icons anywhere.**

### 7.4 Key components

1. **Cloud Selector Hero (landing page):** four large interactive cards (logo, tagline, "best for…" line). Hover: subtle lift + accent glow. Click: theme crossfades, hero art swaps (AWS console illustration / Azure fluent shapes / GCP material blobs / OSS terminal ASCII art), and the curriculum below re-renders for that flavor. Keyboard navigable, 44px+ targets.
2. **Persistent flavor switch (navbar):** compact segmented control with the four logos; always visible; switching anywhere preserves the current page and scroll position.
3. **FlavorTabs (in content):** code/instructions blocks with four tabs; active flavor's tab auto‑selected; other tabs remain accessible for comparison. Tab choice syncs site‑wide.
4. **Architecture diagram:** one Mermaid/SVG diagram per module whose node fills, icons, and labels swap per flavor (e.g., "Object storage" node renders as S3 / Blob / GCS / MinIO with the right icon).
5. **Path progress tracker:** Beginner/Intermediate/Advanced rail in the sidebar; checkmarks from quiz completion (`localStorage`); "Resume where you left off" chip on the landing page.
6. **Quiz component:** client‑side, instant feedback, explanation on wrong answers, per‑module score badge.
7. **Cost calculator island:** sliders (docs count, queries/day, avg tokens) → estimated monthly cost per flavor side‑by‑side; pricing constants live in `validation/`‑verified JSON with a "prices verified on <date>" stamp.
8. **Service‑equivalence matrix page:** sortable table mapping every capability across the four flavors; the active flavor's column is highlighted.
9. **Freshness badges:** every external claim renders a small `✓ verified 2026‑07` badge sourced from validation reports (§9); stale (>90 days) claims render an amber badge.

### 7.5 Motion & polish

- Motion budget: story scenes (§7.0) are the only large animations — one per page, scroll‑scrubbed. Everything else is micro: 150–200ms (firecrawl.dev's observed timing) for hovers/tabs/chips, 250ms theme crossfade, 30–50ms stagger on hero cards.
- GSAP core + ScrollTrigger + ScrambleText for scenes; CSS‑only for micro‑interactions. Ease‑out entrances, exits ~65% of enter duration.
- Every animation must pass the "meaning test" in review: *what does this teach or signal?* If the answer is "nothing," it ships as a static element.
- Fully disabled under `prefers-reduced-motion` (static final frames + captions).
- Dark/light toggle independent of cloud selection (8 total theme combinations, all contrast‑tested).
- Performance budget: Lighthouse ≥ 95 performance/accessibility on Pages; images AVIF/WebP with explicit dimensions; Pagefind and quiz JS lazy‑loaded.

### 7.6 Accessibility checklist (release gate)

- 4.5:1 text contrast in all 8 theme combos; focus rings themed per cloud accent; skip‑to‑content link; heading hierarchy lint in CI; all logos have alt text; FlavorTabs are proper `role="tablist"` with arrow‑key support; quiz announcing results via `aria-live`.

---

## 8. Implementation Phases (ready‑to‑go)

| Phase | Scope | Exit criteria |
|---|---|---|
| **P0 — Scaffold (wk 1)** | Astro site skeleton, token architecture, `data-cloud` switching, GH Actions Pages deploy, neutral theme | Site live on Pages; cloud switch swaps tokens; Lighthouse ≥ 95 |
| **P1 — Design system (wk 1–2)** | 4 cloud themes × light/dark, logos + LICENSES.md, CloudSelector hero, navbar switch, FlavorTabs | All 8 combos pass contrast audit; selector persists & deep‑links |
| **P2 — Core content (wk 2–4)** | Module pages 00–90 (`data/modules.ts` + components) + GCP & AWS flavor data; Mermaid theme‑aware diagrams; Pagefind search | Beginner path completable end‑to‑end on GCP and AWS |
| **P3 — Azure & OSS content (wk 4–5)** | Remaining flavor tabs; service‑equivalence matrix page | All four beginner slices verified by actually running the labs |
| **P4 — Learning interactivity (wk 5–6)** | Quizzes, progress tracker, cost calculator, glossary tooltips | Quiz scores persist; calculator uses verified pricing JSON |
| **P5 — Validation pipeline (wk 6)** | Firecrawl freshness system (§9) wired into CI + scheduled runs; freshness badges | First validation report committed; badges render from it |
| **P6 — Intermediate/Advanced + capstones (wk 7–8)** | Remaining paths, eval/security/finops modules, capstone rubrics | Full curriculum published; link checker green; capstone labs run clean |

CI (GitHub Actions): `build → link check (lychee) → a11y check (pa11y-ci on key pages) → contrast lint → deploy`; separate scheduled workflow for §9.

---

## 9. Verification & Validation Plan (Firecrawl)

Cloud AI services rename, reprice, and deprecate constantly (e.g., AI Studio→Foundry, preview→GA vector stores, model tier churn). The site must **prove its own freshness**.

### 9.1 Claim registry

`validation/sources.yaml` — every verifiable claim in the docs is registered:

```yaml
claims:
  - id: aws-s3-vectors-status
    used_by: site/src/data/flavors/aws.ts#embeddings   # data entry, not a doc file
    claim: "S3 Vectors provides managed vector storage"
    check: "Is S3 Vectors GA, preview, or deprecated? Current name?"
    sources:
      - https://aws.amazon.com/s3/features/vectors/
    volatility: high          # high = check monthly; medium = quarterly; low = biannually
  - id: azure-foundry-name
    doc: docs/azure/40-serving-rag-agents.md
    claim: "Azure AI Foundry is the agent/eval platform (formerly AI Studio)"
    sources:
      - https://azure.microsoft.com/en-us/products/ai-foundry
    volatility: medium
  - id: bedrock-guardrails-features
    ...
  - id: pricing-bedrock-claude    # feeds the cost calculator JSON
    extract_schema: { input_per_mtok: number, output_per_mtok: number, model: string }
    volatility: high
```

Authoring rule: any content entry (in `data/modules.ts` / `data/flavors/*.ts`) naming a service, model, price, tier, or GA status **must** carry a `claimId` field; a CI lint fails on unregistered service names (regex list of known service tokens) — the freshness badge component renders directly from that field.

### 9.2 Validation pipeline

Scheduled GitHub Actions workflow (`validate-content.yml`, monthly + manual dispatch) plus pre‑release run:

1. **Scrape:** Firecrawl `/scrape` each claim's source URLs → markdown.
2. **Extract:** Firecrawl structured extraction (`extract_schema` where defined — e.g., pricing numbers) or LLM check of the scraped markdown against the `check` question.
3. **Judge:** each claim → `CONFIRMED | CHANGED | UNREACHABLE`, with evidence quote + URL.
4. **Report:** write `validation/reports/YYYY-MM.json` + human‑readable `YYYY-MM.md`; commit via PR.
5. **Act:**
   - `CONFIRMED` → refresh the claim's `verified_on` date → site freshness badges update.
   - `CHANGED` → open a GitHub issue per claim with the evidence diff, label `content-drift`, and mark the badge amber on the site.
   - `UNREACHABLE` → retry with Firecrawl `/search` to find the moved page (`site:aws.amazon.com s3 vectors`); if found, propose URL update in the PR.
6. **Pricing sync:** verified pricing extractions overwrite `site/src/data/pricing.json` (calculator input) only when schema‑valid; otherwise keep old values and flag.

### 9.3 Continuous monitors (between scheduled runs)

Use Firecrawl change‑monitoring on the highest‑volatility pages (model catalogs, pricing pages, deprecation notices) with webhook → GitHub `repository_dispatch` → auto‑runs the validation workflow for just the affected claims. The AI judge filters formatting‑only diffs so issues open only on real content changes.

### 9.4 Link & lab validation

- **Links:** lychee link checker in CI on every PR (fast, no Firecrawl cost); Firecrawl only investigates the failures (finds where a doc moved).
- **Labs:** each vertical‑slice lab has a `lab.smoke.sh` that provisions minimal resources, runs steps 1–8, asserts the eval threshold (step 9), and tears down (step 10). Run per‑cloud on manual dispatch before each release (needs cloud credentials in repo secrets; OSS flavor runs fully in CI with kind + MinIO + Qdrant containers).
- **Release gate:** a release tag requires latest validation report < 30 days old with zero unresolved `content-drift` issues on `volatility: high` claims.

### 9.5 Site freshness UX

- Footer: "Content last validated: <date> · <n> claims confirmed · view report" linking to the rendered report page.
- Per‑claim badges inline (see §7.4.9): green `✓ Jul 2026`, amber `⚠ re‑verifying`, so learners always know what's current.

---

## 10. Success Criteria

- A learner can pick any of the 4 flavors and complete the beginner path end‑to‑end (working RAG + dashboard + guardrail + cost estimate) in a weekend, with total cloud spend < $10.
- The site visibly transforms per cloud (theme, logos, diagrams, code) with zero layout breakage across all 8 theme combos.
- 100% of registered claims validated within the last 90 days at any release tag.
- Lighthouse ≥ 95 (performance & accessibility) on landing, one module page, and one lab page.
- Every lab has a passing smoke script and a teardown that returns spend to $0.
