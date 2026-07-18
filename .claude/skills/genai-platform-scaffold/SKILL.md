---
name: genai-platform-scaffold
description: >
  Scaffold a new end-to-end GenAI data platform (ingestion through agents) for a chosen
  cloud, following the architecture taught at github.com/jthiruveedula/genai-data-platform.
  Use when a user wants to start a new RAG/agent project, needs a working ingestion ->
  chunking -> embeddings -> serving -> retrieval -> eval -> observability -> FinOps ->
  agents pipeline, or asks to "build an end-to-end app" / "scaffold a GenAI platform"
  for GCP, AWS, Azure, or a self-hosted OSS stack.
---

# GenAI platform scaffold

Generates a working, minimal GenAI data platform — the same architecture taught module-by-module
at the [GenAI Data Platform curriculum](https://jthiruveedula.github.io/genai-data-platform/) —
scaled to what the user actually needs, not the full 11-module curriculum by default.

**Installable.** This skill folder is portable: copy `.claude/skills/genai-platform-scaffold/`
into any other repo's `.claude/skills/` directory and it works there too. Nothing in it depends
on being inside the curriculum repo itself.

## Step 0 — Ask before generating

Do not start writing files until these are answered (ask in one batch, default to the
recommended option if the user is silent on any of them):

1. **Cloud flavor** — `gcp` (Vertex AI + BigQuery), `aws` (Bedrock + OpenSearch),
   `azure` (Azure OpenAI + AI Search), or `oss` (vLLM + Qdrant, no cloud lock-in).
   If unsure, ask which cloud the user's org already runs on — that's almost always the
   right answer, since the point of this curriculum is "the same architecture everywhere."
2. **Scope** — how much of the pipeline to scaffold:
   - **MVP RAG API** (recommended default): ingestion → chunking → embeddings → vector
     store → a serving API with retrieval. Enough to answer questions over a document set.
   - **MVP + eval + observability**: adds a golden-set eval harness and request tracing.
   - **Full platform**: all of the above plus FinOps unit-economics queries, security
     guardrails (retrieval ACLs, input/output filtering), and an agent/tool-use layer.
3. **Multi-tenant or single-tenant?** Multi-tenant means every document and every query
   carries a `tenant_id` from ingestion through to the FinOps event log; single-tenant
   skips that field everywhere. Multi-tenant is the safer default for anything that will
   ever serve more than one customer or business unit.
4. **Language/runtime** — Python (default; every cloud's SDK is most mature there) or
   TypeScript/Node, if the user's stack is already JS-first.

## Step 1 — Read the architecture reference

Load [`references/architecture.md`](references/architecture.md) before generating anything.
It defines the pipeline stages, what data crosses each boundary, and which decisions are
cloud-specific vs. universal. Every file this skill generates should trace back to one stage
in that pipeline — don't invent stages that aren't there, and don't skip the event-log /
trace-ID plumbing even in an "MVP" scope, since retrofitting it later is expensive and it's
what Module 55/75 in the curriculum are built around.

## Step 2 — Load the cloud-specific reference

Load exactly one of these, matching Step 0's cloud answer, before writing service-calling code:

- [`references/gcp.md`](references/gcp.md) — Cloud Storage, BigQuery, Vertex AI (Gemini
  Enterprise Agent Platform), Vertex AI Vector Search.
- [`references/aws.md`](references/aws.md) — S3, Bedrock, OpenSearch Serverless.
- [`references/azure.md`](references/azure.md) — Blob Storage, Microsoft Foundry, Azure AI Search.
- [`references/oss.md`](references/oss.md) — MinIO/local disk, vLLM, Qdrant, all on Kubernetes
  (or plain Docker Compose for local dev).

Each reference gives real service names, real SDK call shapes, and realistic cost notes —
mirroring the site's `site/src/data/flavors/*.ts` claim-registry discipline. If a service name,
model name, or price looks like it might have changed since this skill was written, say so and
suggest the user verify against current docs rather than asserting it silently.

## Step 3 — Generate the project

Create a new directory (ask for a name if not given — default `genai-platform`) with this shape,
present regardless of cloud choice, only the *implementation* of each file changes per cloud:

```
<project-name>/
├── README.md                 # what this is, how to run it, which cloud/scope was chosen
├── .env.example               # every credential/config the generated code reads
├── ingest/
│   └── ingest.{py,ts}         # land raw docs, idempotent by source ID
├── pipeline/
│   ├── chunk.{py,ts}          # structure-aware chunking
│   └── embed.{py,ts}          # embed + upsert to the vector store
├── serving/
│   └── api.{py,ts}            # retrieval + generation endpoint, streamed response
├── eval/                      # only if scope >= "MVP + eval"
│   ├── golden_set.jsonl       # starter Q&A pairs (ask the user for 5-10 real ones,
│   │                          # or generate obvious placeholders clearly marked TODO)
│   └── run_eval.{py,ts}
├── observability/              # only if scope >= "MVP + eval"
│   └── tracing.{py,ts}        # one trace ID per request, token counts on every span
├── finops/                     # only if scope == "Full platform"
│   └── unit_economics.sql     # event-log × billing-export join, $/query and $/tenant
├── security/                   # only if scope == "Full platform"
│   └── guardrails.{py,ts}     # retrieval ACL check + basic input/output filtering
├── agents/                     # only if scope == "Full platform"
│   └── agent.{py,ts}          # plan-act-observe loop with a step/token budget
└── infra/
    └── <cloud-specific IaC or docker-compose, per the loaded cloud reference>
```

Skip directories the chosen scope doesn't call for — don't generate empty stubs "for later."

## Step 4 — Wire real values, not placeholders

- Every cost note in generated comments must come from the loaded cloud reference file, not be
  invented on the spot — if a number isn't in the reference, write "verify current pricing" instead
  of guessing.
- `tenant_id` (if multi-tenant) must actually flow through every file: ingestion tags it, chunking
  and embedding preserve it, serving filters retrieval by it, tracing logs it, FinOps groups by it.
  A multi-tenant scaffold where one file drops the field silently reintroduces the cross-tenant
  leak that Module 65 of the curriculum exists to prevent.
- The serving API must stream tokens and must route to a fast/cheap model by default — mirror the
  fast-first pattern from the curriculum's Module 25, not "always call the biggest model."

## Step 5 — Verify before handing off

- Run whatever install/typecheck step the chosen runtime has (`pip install -r requirements.txt`
  + a syntax check, or `npm install` + `tsc --noEmit`) so the user isn't handed a scaffold that
  fails on first run.
- Summarize what was generated, what scope was chosen, and — importantly — what the user still
  has to fill in themselves (real credentials, a real document set, real golden-set questions).
  Don't imply the scaffold is production-ready; it's a working starting skeleton.

## When the user already has a project, not a fresh one

If there's an existing `package.json`/`requirements.txt`/git repo in the target directory, don't
overwrite it wholesale. State the exact files you plan to add or touch before writing, same as any
other codebase-modifying task, and prefer additive new files/directories over rewriting what's there.
