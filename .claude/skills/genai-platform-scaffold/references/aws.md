# AWS reference

Service mapping for each pipeline stage, matching the curriculum's AWS flavor.

| Stage | Service |
|---|---|
| Ingestion | S3 (raw) + a Lambda or Glue job (structured landing) |
| Chunking | Lambda or a batch job over the raw corpus |
| Embeddings | Bedrock embedding models (e.g. Titan or Cohere embed, via Bedrock) |
| Vector store | OpenSearch Serverless (vector engine) |
| Serving | Lambda/ECS/Fargate calling Bedrock for generation |
| Observability | X-Ray or CloudWatch + a DynamoDB/S3 event-log table |
| FinOps | Cost & Usage Report (CUR) to S3, queried via Athena, joined against the event log |
| Agents | Bedrock Agents |

## Ingestion

```bash
aws s3 mb s3://${PROJECT_NAME}-gdp-raw --region ${REGION}
```

A Lambda (or Glue job for larger volumes) writes one row per document into a DynamoDB table or an
Athena-queryable table, keyed by a stable `source_id` (and `tenant_id` if multi-tenant) —
re-running must upsert on that key.

## Embeddings + vector store

```python
import boto3

bedrock = boto3.client("bedrock-runtime", region_name=REGION)
response = bedrock.invoke_model(
    modelId="amazon.titan-embed-text-v2:0",
    body=json.dumps({"inputText": chunk_text}),
)
```

Upsert vectors (plus `chunk_id`, `source_id`, `tenant_id`, heading path) into an OpenSearch
Serverless collection with a vector engine index. Verify the current embedding model ID against
[Bedrock's model catalog](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)
before hardcoding it — Bedrock's available models change over time.

## Serving

Call Bedrock's `invoke_model` (or `converse`) API with the fast-tier model first (Claude Haiku is
the curriculum's reference fast tier); escalate to a reasoning-tier model only on low retrieval
confidence. Stream via Bedrock's streaming response API. Point generated cost-note comments at the
curriculum's [freshness page](https://jthiruveedula.github.io/genai-data-platform/freshness/)
rather than hardcoding a per-Mtok price that will go stale.

## FinOps

```sql
-- Athena query over the CUR, joined against the event log
SELECT
  e.tenant_id,
  COUNT(*) AS queries,
  SUM(cur.line_item_unblended_cost) AS total_cost,
  SUM(cur.line_item_unblended_cost) / COUNT(*) AS cost_per_query
FROM event_log e
JOIN cur_table cur ON e.request_id = cur.resource_id
GROUP BY e.tenant_id
ORDER BY cost_per_query DESC;
```

## Infra

A minimal scaffold needs: one S3 bucket, an OpenSearch Serverless collection, IAM roles scoped to
Bedrock invoke permissions, and (for "Full platform" scope) a CUR delivered to S3 + an Athena
table over it. Generate either Terraform/CDK or a plain `aws` CLI setup script depending on
what's already in the target project.
