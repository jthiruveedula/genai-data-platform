import type { CloudId } from "../modules";

export interface FlavorEntry {
  services: string[];
  storage: string;
  snippet: string;
  labSteps: string[];
  costNote: string;
  claimId: string;
}

export const cloud: CloudId = "gcp";

export const flavor: Record<string, FlavorEntry> = {
  "00-foundations": {
    services: ["Vertex AI"],
    storage: "N/A (concepts only)",
    snippet: `# No cloud calls in this module — pure concepts.\n# Vertex AI Model Garden is where you'll pick embedding + LLM models later.`,
    labSteps: [
      "Read the concept page and glossary.",
      "Open Vertex AI Model Garden in the console and browse available embedding models (no calls made).",
    ],
    costNote: "$0 — no infrastructure created in this module.",
    claimId: "gcp-vertex-model-garden",
  },
  "10-ingestion": {
    services: ["Cloud Storage", "Dataflow", "BigQuery"],
    storage: "Cloud Storage (raw) + BigQuery (structured)",
    snippet: `gcloud storage buckets create gs://\${PROJECT_ID}-gdp-raw --location=\${REGION}\n\n# Minimal Dataflow batch job template\npython ingest_pipeline.py \\\n  --input="gs://\${PROJECT_ID}-gdp-raw/*.pdf" \\\n  --output_table="\${PROJECT_ID}:gdp.raw_documents" \\\n  --runner=DataflowRunner \\\n  --project=\${PROJECT_ID} \\\n  --region=\${REGION}`,
    labSteps: [
      "Create a Cloud Storage bucket for raw documents.",
      "Upload 3-5 sample PDFs.",
      "Run the Dataflow batch job to land metadata rows in BigQuery.",
      "Verify row count in BigQuery matches uploaded file count.",
    ],
    costNote: "~$0.05 for a handful of PDFs (Dataflow small batch + GCS/BigQuery storage).",
    claimId: "gcp-dataflow-ingestion",
  },
  "15-chunking": {
    services: ["Dataflow", "BigQuery"],
    storage: "BigQuery (chunked rows with metadata)",
    snippet: `# Recursive chunking with LangChain, run as a Dataflow ParDo\nfrom langchain_text_splitters import RecursiveCharacterTextSplitter\n\nsplitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)\nchunks = splitter.split_text(document_text)\n\n# Each chunk row: {doc_id, chunk_id, text, char_start, char_end}\n# written to \${PROJECT_ID}:gdp.chunks`,
    labSteps: [
      "Take the raw rows landed in Module 10's BigQuery table.",
      "Run the recursive chunker at chunk_size=800, chunk_overlap=120.",
      "Land chunk rows (doc_id, chunk_id, text, offsets) in a new BigQuery table.",
      "Re-run with chunk_size=200 and compare: count chunks, spot orphaned mid-sentence splits.",
    ],
    costNote: "~$0.02 for a small Dataflow batch job over a handful of documents.",
    claimId: "gcp-dataflow-chunking",
  },
  "20-embeddings": {
    services: ["Vertex AI Embeddings", "Vertex AI Vector Search"],
    storage: "Vertex AI Vector Search index",
    snippet: `from vertexai.language_models import TextEmbeddingModel\n\nmodel = TextEmbeddingModel.from_pretrained("text-embedding-004")\nembeddings = model.get_embeddings([chunk.text for chunk in chunks])\n\n# Upsert into a Vertex AI Vector Search index\nindex.upsert_datapoints(\n    datapoints=[{"datapoint_id": c.chunk_id, "feature_vector": e.values} for c, e in zip(chunks, embeddings)]\n)`,
    labSteps: [
      "Embed all chunks from Module 15 with text-embedding-004.",
      "Create a Vertex AI Vector Search index and upsert the vectors.",
      "Embed two different queries and eyeball their nearest neighbors in the index.",
      "Confirm semantically similar chunks (not just keyword-similar) land near each other.",
    ],
    costNote: "~$0.02 for embedding a handful of documents' worth of chunks.",
    claimId: "gcp-vertex-embeddings",
  },
  "25-serving": {
    services: ["Cloud Run", "Vertex AI (Gemini Flash)"],
    storage: "N/A — reads the Module 20 vector index at request time",
    snippet: `@app.post("/ask")\nasync def ask(q: Question):\n    query_vec = embed(q.text)\n    neighbors = index.find_neighbors(query_vec, num_neighbors=5)\n    prompt = build_prompt(q.text, neighbors)\n    response = gemini_flash.generate_content(prompt)\n    return {"answer": response.text, "citations": [n.chunk_id for n in neighbors]}`,
    labSteps: [
      "Deploy a small FastAPI app to Cloud Run wrapping embed -> retrieve -> prompt -> Gemini Flash.",
      "Ask a question your Module 10 documents can answer; confirm the response cites a real chunk.",
      "Ask an out-of-scope question; confirm the model says it doesn't know instead of guessing.",
      "Log every request/response pair — this becomes the event log Module 30 builds dashboards on.",
    ],
    costNote: "~$0.01 per query (Gemini Flash fast tier) + negligible Cloud Run cost at low volume.",
    claimId: "gcp-cloud-run-rag-api",
  },
  "35-retrieval": {
    services: ["Vertex AI Vector Search", "Vertex AI"],
    storage: "Vertex AI Vector Search index (hybrid dense + sparse)",
    snippet: `# Hybrid query: dense (embedding) + sparse (keyword) combined\nfrom google.cloud import aiplatform\n\nresponse = index_endpoint.find_neighbors(\n    deployed_index_id="gdp_chunks",\n    queries=[{"embedding": dense_vec, "sparse_embedding": sparse_vec}],\n    num_neighbors=20,\n)\n\n# Rerank top-20 with a cross-encoder before answering\nreranked = reranker.rerank(query, [n.text for n in response[0]], top_k=5)`,
    labSteps: [
      "Enable hybrid search on the Module 15 chunk index (dense + sparse fields).",
      "Run a query with vector-only search, note top-5 results.",
      "Re-run the same query with hybrid search enabled, compare top-5.",
      "Add a cross-encoder reranking pass over the top-20 hybrid results and compare the final top-5 again.",
    ],
    costNote: "~$0.03 for a handful of hybrid queries + rerank calls on a small index.",
    claimId: "gcp-vector-search-hybrid",
  },
};
