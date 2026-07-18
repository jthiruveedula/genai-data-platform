# GCP reference

Service mapping for each pipeline stage, matching the curriculum's GCP flavor.

| Stage | Service |
|---|---|
| Ingestion | Cloud Storage (raw) + Dataflow (batch/stream load) + BigQuery (structured metadata) |
| Chunking | Dataflow or Cloud Run job over the raw corpus |
| Embeddings | Vertex AI embedding models (e.g. `gemini-embedding-001`) |
| Vector store | Vertex AI Vector Search |
| Serving | Cloud Run (or GKE) calling Vertex AI's Gemini Enterprise Agent Platform for generation |
| Observability | Cloud Trace + BigQuery event-log table |
| FinOps | Cloud Billing export to BigQuery, joined against the event-log table |
| Agents | Gemini Enterprise Agent Platform's function calling / tool use |

## Ingestion

```bash
gcloud storage buckets create gs://${PROJECT_ID}-gdp-raw --location=${REGION}
```

A Dataflow (or simpler, Cloud Run) job reads from the raw bucket and writes one row per document
into a BigQuery table keyed by a stable `source_id` (and `tenant_id` if multi-tenant) — re-running
the job must `MERGE`/upsert on that key, never blind-append.

## Embeddings + vector store

```python
from google.cloud import aiplatform

aiplatform.init(project=PROJECT_ID, location=REGION)
model = aiplatform.TextEmbeddingModel.from_pretrained("gemini-embedding-001")
embeddings = model.get_embeddings([chunk.text for chunk in chunks])
```

Upsert vectors (plus `chunk_id`, `source_id`, `tenant_id`, heading path) into a Vertex AI Vector
Search index. Verify the current embedding model name against
[Vertex AI's model garden](https://cloud.google.com/vertex-ai/generative-ai/docs/models) before
committing to it in generated code — model names and defaults change.

## Serving

Call the Gemini Enterprise Agent Platform's generation endpoint with the fast-tier model first;
only escalate to a reasoning-tier model when retrieval confidence is low. Stream the response.
Cost note: as of this skill's writing, fast-tier list pricing (input/output per Mtok) is tracked
on the curriculum's [freshness page](https://jthiruveedula.github.io/genai-data-platform/freshness/)
— generated cost-note comments should point there rather than hardcoding a number that will go stale.

## FinOps

```sql
SELECT
  e.tenant_id,
  COUNT(*) AS queries,
  SUM(b.cost) AS total_cost,
  SUM(b.cost) / COUNT(*) AS cost_per_query
FROM `${PROJECT_ID}.gdp.event_log` e
JOIN `${PROJECT_ID}.billing_export.gcp_billing_export_v1` b USING (request_id)
GROUP BY e.tenant_id
ORDER BY cost_per_query DESC;
```

## Infra

A minimal scaffold needs: one Cloud Storage bucket, one BigQuery dataset, a Vertex AI Vector
Search index, and (for "Full platform" scope) a Cloud Billing export sink. Generate either
Terraform or a `gcloud` setup script depending on what's already in the target project — ask if
unclear.
