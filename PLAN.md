# GenAI Data Platform — Brainstorm & Plan

Reference architecture + pipelines for feeding data into GenAI apps: ingestion,
chunking/vectorization ("chapter indexing"), serving, usage/behavior monitoring,
prompt analytics, and guardrails.

Sibling to [`databricks-cross-cloud-migration`](../databricks-cross-cloud-migration)
— same Databricks-first approach, applied to the GenAI data lifecycle instead of
cloud migration.

## Open decision

Docs-site style (architecture guides, like the migration repo) vs. deployable
codebase (real DLT pipelines, notebooks, Terraform)? **TBD — decide at kickoff.**
Leaning toward deployable codebase with docs alongside, since this repo's value
is the working pipelines, not just the narrative.

## Scope

### 1. Ingestion layer
- Source connectors: docs/wikis, ticketing (Jira/ServiceNow), Slack/Teams, DBs,
  S3/ADLS/GCS blobs, APIs
- Databricks-native: Lakeflow Connect / Auto Loader for streaming ingestion,
  Delta Live Tables (DLT) for CDC + schema evolution
- Landing zone → Bronze (raw) → Silver (cleaned/normalized) in Unity Catalog

### 2. Chunking & vectorization ("chapter indexing")
- Chunking strategies: semantic/recursive/sliding-window, per-doc-type templates
  (code, PDFs, transcripts)
- Embedding pipeline: Databricks Vector Search or pluggable (OpenAI/Cohere/BGE),
  batch + incremental re-embedding on change
- Metadata enrichment: source lineage, ACL tags, freshness, chapter/section
  hierarchy for citation-grade retrieval

### 3. Serving layer
- RAG retrieval API (Databricks Model Serving or Mosaic AI Gateway) fronting
  the vector index
- Prompt templates versioned, A/B-testable

### 4. Usage & behavior monitoring
- Log every request/response/latency/token-cost/retrieved-chunks to a Delta
  table (the "GenAI event log")
- Session reconstruction: tie multi-turn conversations together for behavior
  analysis
- Lakehouse Monitoring or custom DLT expectations for drift (embedding drift,
  retrieval quality decay)

### 5. Prompt analytics
- Clustering/topic-modeling on prompts to surface intent categories
- Failure-mode detection: low-retrieval-confidence answers, hallucination
  flags (via LLM-judge), abandonment/rephrase patterns
- Dashboards: cost per query, latency percentiles, top failing intents,
  satisfaction proxy (thumbs up/down, follow-up rate)

### 6. Guardrails
- Input: PII/secrets detection, prompt-injection detection, topic/allow-list
  filters
- Output: toxicity/hallucination scoring, citation-verification against
  retrieved chunks, policy-based redaction
- Enforcement point: gateway middleware (pre/post LLM call) + async audit trail

## Proposed repo shape

```
genai-data-platform/
  ingestion/          # connectors, Auto Loader/DLT pipelines
  processing/         # chunking, embedding, vector index sync
  serving/            # RAG API, gateway, prompt template registry
  monitoring/         # event logging schema, dashboards, drift checks
  analytics/          # prompt clustering, notebooks, LLM-judge eval
  guardrails/         # input/output filters, policy configs
  docs/               # architecture guides
  infra/              # Terraform/Databricks Asset Bundles
```

## Next steps

1. Decide docs-vs-code scope (see Open decision above)
2. Scaffold folder structure + README
3. Pick first vertical slice to build end-to-end (e.g. single doc source →
   chunk → embed → serve → log) before widening
