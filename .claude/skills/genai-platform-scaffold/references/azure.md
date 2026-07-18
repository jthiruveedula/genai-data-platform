# Azure reference

Service mapping for each pipeline stage, matching the curriculum's Azure flavor. Note: what used
to be called "Azure AI Foundry" was renamed **Microsoft Foundry** (January 2026) — use that name
in generated code, comments, and docs.

| Stage | Service |
|---|---|
| Ingestion | Blob Storage (raw) + an Azure Function (structured landing) |
| Chunking | Azure Function or a batch job over the raw corpus |
| Embeddings | Microsoft Foundry embedding models (Azure OpenAI embeddings) |
| Vector store | Azure AI Search (vector index) |
| Serving | Azure Functions / App Service calling Microsoft Foundry for generation |
| Observability | Application Insights + a Cosmos DB or table-storage event-log |
| FinOps | Microsoft Cost Management export to Blob Storage, joined against the event log |
| Agents | Microsoft Foundry Agent Service |

## Ingestion

```bash
az storage container create --name gdp-raw --account-name ${STORAGE_ACCOUNT}
```

An Azure Function writes one row per document into a table (Cosmos DB or Azure Table Storage),
keyed by a stable `source_id` (and `tenant_id` if multi-tenant) — re-running must upsert on that
key, not append.

## Embeddings + vector store

```python
from openai import AzureOpenAI

client = AzureOpenAI(azure_endpoint=ENDPOINT, api_key=API_KEY, api_version="2026-01-01-preview")
response = client.embeddings.create(input=chunk_text, model="text-embedding-3-large")
```

Upsert vectors (plus `chunk_id`, `source_id`, `tenant_id`, heading path) into an Azure AI Search
index with a vector field. Verify the current embedding deployment name in the target Microsoft
Foundry resource before hardcoding it — deployment names are user-chosen per resource.

## Serving

Call Microsoft Foundry's chat completions endpoint (via the Azure OpenAI SDK) with the fast-tier
model first (GPT-5.6 Luna is the curriculum's reference fast tier); escalate to a reasoning-tier
model only on low retrieval confidence. Stream via the SDK's streaming response mode. Point
generated cost-note comments at the curriculum's
[freshness page](https://jthiruveedula.github.io/genai-data-platform/freshness/) rather than
hardcoding a per-Mtok price that will go stale.

## FinOps

```sql
SELECT
  e.tenant_id,
  COUNT(*) AS queries,
  SUM(c.cost_in_billing_currency) AS total_cost,
  SUM(c.cost_in_billing_currency) / COUNT(*) AS cost_per_query
FROM event_log e
JOIN cost_export c ON e.request_id = c.resource_id
GROUP BY e.tenant_id
ORDER BY cost_per_query DESC;
```

Also compare pay-as-you-go pricing against a Provisioned Throughput Unit (PTU) commitment once
volume is predictable — PTUs trade a fixed monthly cost for a lower marginal rate at steady, high
volume, the same capacity-planning trade-off as reserved capacity on other clouds.

## Infra

A minimal scaffold needs: one Storage Account with a Blob container, an Azure AI Search resource,
a Microsoft Foundry resource with an embedding + chat deployment, and (for "Full platform" scope)
a Cost Management export to Blob Storage. Generate either Bicep/Terraform or a plain `az` CLI
setup script depending on what's already in the target project.
