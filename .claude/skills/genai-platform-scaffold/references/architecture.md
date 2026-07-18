# Architecture reference

The pipeline every generated scaffold implements, regardless of cloud. Each stage maps to a
module in the [curriculum](https://jthiruveedula.github.io/genai-data-platform/) this skill is
extracted from — read the linked module page for the full reasoning if a design choice here
seems under-explained.

## Stages

1. **Ingestion** (curriculum Module 10) — land raw source documents exactly as received, into
   object storage, before any transformation. Every ingestion run must be idempotent by a stable
   source ID (file path, ticket ID, URL) so re-running after a partial failure never duplicates
   documents. If multi-tenant, tag every document with `tenant_id` here — nothing downstream can
   recover a tenant boundary that wasn't captured at ingestion.

2. **Chunking** (Module 15) — split documents into retrievable pieces. Prefer structure-aware
   splitting (headings, paragraphs, code fences) over fixed-size splitting; carry parent-document
   ID, position, and heading path as chunk metadata so retrieval can reassemble context around a
   hit. Chunk size is a genuine trade-off (retrieval precision vs. context cost) — don't hardcode
   one value without telling the user it's a starting point to tune, not a final answer.

3. **Embeddings + vector store** (Module 20) — embed each chunk, upsert to a vector index, keep
   the `tenant_id` and chunk metadata alongside the vector. Version the index by embedding model
   name — re-embedding with a new model and mixing old/new vectors in one index silently breaks
   nearest-neighbor search.

4. **Serving** (Module 25) — the RAG API: embed the incoming query, retrieve nearest chunks
   (filtered by `tenant_id` if multi-tenant), build a prompt with the retrieved context first and
   the user's question last (this ordering is also what makes prompt caching work later), call a
   fast/cheap model by default, and stream the response.

5. **Retrieval quality** (Module 35, "MVP + eval" and up) — hybrid (dense + sparse) retrieval
   with rank fusion beats dense-only on exact-term queries (product codes, form numbers, proper
   nouns) without hurting semantic queries. A reranker is an optional precision upgrade on top,
   not a replacement for measuring recall on your own corpus.

6. **Evaluation** (Module 45, "MVP + eval" and up) — a golden set of real (or clearly-marked
   placeholder) question/answer pairs, scored for retrieval recall and generation faithfulness
   separately. This is what turns "the last change felt worse" into a number that gates a deploy.

7. **Observability** (Module 55, "MVP + eval" and up) — one trace ID per request, propagated
   through retrieval and generation, with token counts recorded on every span. This is not
   optional infrastructure to add "later" — Module 75's entire cost model depends on this
   event log existing from day one.

8. **Security** (Module 65, "Full platform" only) — retrieval-time ACL enforcement (a user must
   never retrieve a chunk they couldn't open as a document), input filtering against prompt
   injection, output guardrails, and PII redaction before logging or display. Layered, not a
   single gate — assume each layer will occasionally fail and rely on the others.

9. **FinOps** (Module 75, "Full platform" only) — join the observability event log against the
   cloud's billing export to get $/query and $/tenant. Prompt caching (order stable content
   first) and fast-model-first routing are the two changes that move the needle without touching
   answer quality.

10. **Agents** (Module 85, "Full platform" only) — a plan → act → observe loop around the same
    retrieval/generation services, bounded by a hard step and token budget. Tools are the safety
    boundary: an agent is only as safe as the tool interfaces exposed to it.

## What's universal vs. cloud-specific

Universal across every cloud reference: the stage order above, the idempotent-ingestion
requirement, structure-aware chunking, the trace-ID/token-count discipline, fast-model-first
routing, and the retrieval-ACL requirement for multi-tenant scaffolds. Cloud-specific: which
managed service implements each stage, exact SDK call shapes, and real cost-per-unit numbers —
all in the per-cloud reference files.
