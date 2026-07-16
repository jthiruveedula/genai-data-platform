import type { CloudId } from "../modules";
import type { FlavorEntry } from "./gcp";

export const cloud: CloudId = "oss";

export const flavor: Record<string, FlavorEntry> = {
  "00-foundations": {
    services: ["vLLM", "HF Hub"],
    storage: "N/A (concepts only)",
    snippet: `# No infra calls in this module — pure concepts.\n# Hugging Face Hub is where you'll pick embedding + LLM models later.`,
    labSteps: [
      "Read the concept page and glossary.",
      "Browse the Hugging Face Hub model catalog (no downloads yet).",
    ],
    costNote: "$0 — no infrastructure created in this module.",
    claimId: "oss-hf-hub-catalog",
  },
  "10-ingestion": {
    services: ["MinIO", "Airflow", "Postgres"],
    storage: "MinIO (raw) + Postgres (structured)",
    snippet: `mc mb local/gdp-raw\n\nmc cp ./sample-docs/*.pdf local/gdp-raw/\n\n# Airflow DAG lands metadata rows in Postgres\nairflow dags trigger gdp_ingest_docs`,
    labSteps: [
      "Create a MinIO bucket for raw documents (docker compose up minio).",
      "Upload 3-5 sample PDFs with the mc client.",
      "Trigger the Airflow DAG to land metadata rows in Postgres.",
      "Verify row count in Postgres matches uploaded file count.",
    ],
    costNote: "$0 on a local kind cluster; ~compute cost only if run on cloud VMs.",
    claimId: "oss-airflow-ingestion",
  },
  "15-chunking": {
    services: ["Airflow", "Postgres"],
    storage: "Postgres (chunked rows with metadata)",
    snippet: `# Recursive chunking with LangChain, run as an Airflow task\nfrom langchain_text_splitters import RecursiveCharacterTextSplitter\n\nsplitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)\nchunks = splitter.split_text(document_text)\n\n# Each chunk row: (doc_id, chunk_id, text, char_start, char_end)\n# inserted into the chunks table via psycopg2`,
    labSteps: [
      "Take the raw rows landed in Module 10's Postgres table.",
      "Run the recursive chunker at chunk_size=800, chunk_overlap=120 as an Airflow task.",
      "Insert chunk rows (doc_id, chunk_id, text, offsets) into a new chunks table.",
      "Re-run with chunk_size=200 and compare: count chunks, spot orphaned mid-sentence splits.",
    ],
    costNote: "$0 on a local kind cluster; negligible CPU for a handful of documents.",
    claimId: "oss-airflow-chunking",
  },
  "20-embeddings": {
    services: ["TEI (Text Embeddings Inference)", "Qdrant"],
    storage: "Qdrant collection",
    snippet: `# Embed via a local TEI server (bge-base-en-v1.5)\nresp = requests.post("http://tei:80/embed", json={"inputs": [c.text for c in chunks]})\nvectors = resp.json()\n\nclient.upsert(\n    collection_name="gdp_chunks",\n    points=[{"id": c.chunk_id, "vector": v, "payload": {"text": c.text}} for c, v in zip(chunks, vectors)],\n)`,
    labSteps: [
      "Run TEI locally serving bge-base-en-v1.5 and embed all chunks from Module 15.",
      "Create a Qdrant collection and upsert the vectors.",
      "Embed two different queries and eyeball their nearest neighbors.",
      "Confirm semantically similar chunks (not just keyword-similar) land near each other.",
    ],
    costNote: "$0 on a local kind cluster; negligible CPU/GPU for a handful of documents.",
    claimId: "oss-tei-qdrant-embeddings",
  },
  "25-serving": {
    services: ["FastAPI", "vLLM (open-weight model)"],
    storage: "N/A — reads the Module 20 Qdrant collection at request time",
    snippet: `@app.post("/ask")\nasync def ask(q: Question):\n    query_vec = embed(q.text)\n    neighbors = client.query_points(collection_name="gdp_chunks", query=query_vec, limit=5)\n    prompt = build_prompt(q.text, neighbors.points)\n    response = await vllm_client.chat.completions.create(model="Qwen2.5-7B-Instruct", messages=prompt)\n    return {"answer": response, "citations": [n.id for n in neighbors.points]}`,
    labSteps: [
      "Deploy a FastAPI app on K8s wrapping embed -> retrieve -> prompt -> vLLM-served model.",
      "Ask a question your Module 10 documents can answer; confirm the response cites a real chunk.",
      "Ask an out-of-scope question; confirm the model says it doesn't know instead of guessing.",
      "Log every request/response pair — this becomes the event log Module 30 builds dashboards on.",
    ],
    costNote: "$0 on a local kind cluster; GPU compute cost only if self-hosting at scale.",
    claimId: "oss-vllm-rag-api",
  },
  "35-retrieval": {
    services: ["Qdrant", "TEI"],
    storage: "Qdrant (hybrid dense + sparse vectors)",
    snippet: `# Hybrid search in Qdrant: dense + sparse (BM25-like) vectors\nresults = client.query_points(\n    collection_name="gdp_chunks",\n    query=dense_vec,\n    using="dense",\n    with_payload=True,\n    limit=20,\n)\n\n# Rerank top-20 with a cross-encoder served via TEI\nreranked = cross_encoder.rerank(query, [r.payload["text"] for r in results.points], top_k=5)`,
    labSteps: [
      "Enable a sparse vector field on the Module 15 chunk collection alongside the dense one.",
      "Run a query with dense search only, note top-5 results.",
      "Re-run with Qdrant's hybrid (dense + sparse) query, compare top-5.",
      "Add a cross-encoder reranking pass (served via TEI) over the top-20 hybrid results and compare the final top-5 again.",
    ],
    costNote: "$0 on a local kind cluster; negligible CPU for a handful of queries.",
    claimId: "oss-qdrant-hybrid",
  },
};
