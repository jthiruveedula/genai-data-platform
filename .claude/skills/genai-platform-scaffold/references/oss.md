# OSS (self-hosted) reference

Service mapping for each pipeline stage, matching the curriculum's self-hosted flavor. Runs on
Kubernetes for production; a plain `docker-compose.yml` is the right default for local dev and
should be generated alongside (or instead of) K8s manifests unless the user explicitly asked for
a cluster.

| Stage | Service |
|---|---|
| Ingestion | MinIO (S3-compatible) or local disk (raw) |
| Chunking | A plain Python/Node job over the raw corpus |
| Embeddings | A self-hosted embedding model (e.g. via TEI — Text Embeddings Inference) |
| Vector store | Qdrant |
| Serving | vLLM for generation, behind a FastAPI/Express serving layer |
| Observability | Prometheus + Grafana, or plain structured logs to start |
| FinOps | OpenCost (if on K8s) joined against the event log |
| Agents | LiteLLM as a model-routing layer + MCP servers for tool use |

## Ingestion

MinIO (or plain local/network disk for a small scaffold) holds raw documents. A job writes one
row per document into a lightweight metadata store (SQLite is fine for a small scaffold; Postgres
for anything multi-tenant), keyed by a stable `source_id` — re-running must upsert on that key.

## Embeddings + vector store

```python
from qdrant_client import QdrantClient

client = QdrantClient(url="http://localhost:6333")
client.upsert(
    collection_name="gdp_chunks",
    points=[{"id": chunk_id, "vector": embedding, "payload": {"source_id": source_id, "tenant_id": tenant_id}}],
)
```

Run embeddings through a self-hosted model server (TEI, or vLLM with an embedding-capable model)
rather than calling out to a paid API — that's the point of the OSS flavor. Use `query_points`
(not the deprecated `search`) for retrieval, per Qdrant's current client API.

## Serving

```bash
vllm serve <model-name> --enable-prefix-caching --port 8000
```

`--enable-prefix-caching` gets the same repeated-context speedup as hosted prompt caching, at no
extra charge — always enable it. Put the FastAPI/Express serving layer in front of vLLM's OpenAI-
compatible endpoint; route to a small/fast model by default, escalate to a larger model only on
low retrieval confidence, same as every other cloud flavor.

## FinOps

```bash
curl -s http://opencost:9003/allocation/compute \
  --data-urlencode window=1d \
  --data-urlencode aggregate=namespace | jq '.data[0]'
```

Join OpenCost's per-namespace GPU cost against the event log's request counts to get $/query. For
a non-Kubernetes scaffold, substitute a simple GPU-hour × hours-running calculation instead of
OpenCost — the underlying idea (GPU cost ÷ requests served) is the same.

## Infra

Generate a `docker-compose.yml` with Qdrant, a TEI or vLLM-embedding container, and the vLLM
generation server as the default local-dev path. Only generate Kubernetes manifests (with
OpenCost) if the user confirms this is going to production on a real cluster — a fresh scaffold
almost never needs K8s on day one.
