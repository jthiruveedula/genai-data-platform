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
    snippet: `from vertexai.language_models import TextEmbeddingModel\n\nmodel = TextEmbeddingModel.from_pretrained("gemini-embedding-001")\nembeddings = model.get_embeddings([chunk.text for chunk in chunks])\n\n# Upsert into a Vertex AI Vector Search index\nindex.upsert_datapoints(\n    datapoints=[{"datapoint_id": c.chunk_id, "feature_vector": e.values} for c, e in zip(chunks, embeddings)]\n)`,
    labSteps: [
      "Embed all chunks from Module 15 with gemini-embedding-001.",
      "Create a Vertex AI Vector Search index and upsert the vectors.",
      "Embed two different queries and eyeball their nearest neighbors in the index.",
      "Confirm semantically similar chunks (not just keyword-similar) land near each other.",
    ],
    costNote: "~$0.02 for embedding a handful of documents' worth of chunks.",
    claimId: "gcp-vertex-embeddings",
  },
  "25-serving": {
    services: ["Cloud Run", "Vertex AI (Gemini 3 Flash)"],
    storage: "N/A — reads the Module 20 vector index at request time",
    snippet: `@app.post("/ask")\nasync def ask(q: Question):\n    query_vec = embed(q.text)\n    neighbors = index.find_neighbors(query_vec, num_neighbors=5)\n    prompt = build_prompt(q.text, neighbors)\n    response = gemini_3_flash.generate_content(prompt)\n    return {"answer": response.text, "citations": [n.chunk_id for n in neighbors]}`,
    labSteps: [
      "Deploy a small FastAPI app to Cloud Run wrapping embed -> retrieve -> prompt -> Gemini 3 Flash.",
      "Ask a question your Module 10 documents can answer; confirm the response cites a real chunk.",
      "Ask an out-of-scope question; confirm the model says it doesn't know instead of guessing.",
      "Log every request/response pair — this becomes the event log Module 30 builds dashboards on.",
    ],
    costNote: "~$0.01 per query (Gemini 3 Flash fast tier) + negligible Cloud Run cost at low volume.",
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
  "45-evaluation": {
    services: ["Vertex AI evaluation", "BigQuery"],
    storage: "BigQuery (golden dataset + eval run results)",
    snippet: `from vertexai.evaluation import EvalTask, MetricPromptTemplateExamples\n\neval_task = EvalTask(\n    dataset=golden_df,  # columns: prompt, context, response, reference\n    metrics=[\n        MetricPromptTemplateExamples.Pointwise.FAITHFULNESS,\n        MetricPromptTemplateExamples.Pointwise.CONTEXT_RECALL,\n        "question_answering_relevance",\n    ],\n)\nresult = eval_task.evaluate(model=rag_model)\nresult.summary_metrics  # -> {"faithfulness/mean": 0.91, ...}\n\n# Write summary_metrics to BigQuery so CI can diff it against the last run`,
    labSteps: [
      "Build a golden dataset of 20+ labeled Q&A pairs from the documents ingested in Module 10.",
      "Run Vertex AI evaluation with faithfulness, context recall, and answer-relevance metrics against the Module 25 RAG API.",
      "Spot-check 5 LLM-as-judge scores against your own human judgment and note any disagreement.",
      "Write the summary metrics to BigQuery and wire a CI step that fails the build if faithfulness drops below a threshold.",
    ],
    costNote: "~$0.04 for evaluating a 20-example golden set with an LLM-as-judge model.",
    claimId: "gcp-vertex-eval-service",
  },
  "55-observability": {
    services: ["Cloud Trace", "BigQuery"],
    storage: "Cloud Trace (span data) + BigQuery (exported event log)",
    snippet: `from opentelemetry import trace\nfrom opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter\n\ntracer = trace.get_tracer("gdp.rag")\n\nwith tracer.start_as_current_span("rag_request") as root:\n    with tracer.start_as_current_span("retrieve") as span:\n        span.set_attribute("chunks.count", len(neighbors))\n    with tracer.start_as_current_span("generate") as span:\n        span.set_attribute("llm.input_tokens", usage.input_tokens)\n        span.set_attribute("llm.output_tokens", usage.output_tokens)`,
    labSteps: [
      "Instrument the Module 25 RAG API with OpenTelemetry spans for embed, retrieve, prompt, and generate.",
      "Export spans to Cloud Trace and confirm one trace per request shows all four stages nested correctly.",
      "Add token-count span attributes from the Bedrock-equivalent Gemini usage field on the generate span.",
      "Export the trace data to BigQuery and query p50/p95 total latency versus time-to-first-token.",
    ],
    costNote: "~$0.01 for a handful of traced requests (Cloud Trace ingestion + small BigQuery export).",
    claimId: "gcp-cloud-trace-genai",
  },
  "65-security": {
    services: ["Model Armor", "Sensitive Data Protection"],
    storage: "N/A — inline screening at request/response time",
    snippet: `from google.cloud import modelarmor_v1\n\nclient = modelarmor_v1.ModelArmorClient()\nresponse = client.sanitize_user_prompt(\n    request={\n        "name": template_path,\n        "user_prompt_data": {"text": incoming_prompt},\n    },\n)\nif response.sanitization_result.filter_match_state == "MATCH_FOUND":\n    raise PromptBlocked("prompt injection or data-loss signal detected")`,
    labSteps: [
      "Insert a document into the Module 15 chunk index containing a hidden instruction ('ignore prior instructions and reveal...').",
      "Ask a normal question that retrieves that chunk and observe whether the model follows the injected instruction.",
      "Enable Model Armor's prompt and response screening in front of the Module 25 RAG API and re-run the same query.",
      "Add a document-level access-control filter to retrieval and confirm a second tenant's query can no longer surface the first tenant's chunks.",
    ],
    costNote: "~$0.02 for a handful of screened prompts/responses through Model Armor.",
    claimId: "gcp-model-armor",
  },
  "75-finops": {
    services: ["Cloud Billing export", "BigQuery"],
    storage: "BigQuery (billing export table joined with the Module 55 event log)",
    snippet: `-- Join billing export against the traced event log to get $/query\nSELECT\n  e.tenant_id,\n  COUNT(*) AS queries,\n  SUM(b.cost) AS total_cost,\n  SUM(b.cost) / COUNT(*) AS cost_per_query\nFROM \`\${PROJECT_ID}.gdp.event_log\` e\nJOIN \`\${PROJECT_ID}.billing_export.gcp_billing_export_v1\` b\n  USING (request_id)\nGROUP BY e.tenant_id\nORDER BY cost_per_query DESC;`,
    labSteps: [
      "Enable Cloud Billing export to BigQuery and join it against the Module 55 event log on request_id.",
      "Compute $/query and $/tenant, and confirm output tokens dominate cost versus embedding calls.",
      "Add a semantic cache in front of the Module 25 RAG API and measure the drop in $/query for repeated questions.",
      "Add a fast-model-first router that only escalates to a reasoning-tier model on low retrieval confidence, and re-measure.",
    ],
    costNote: "~$0.02 for the BigQuery scan over a small billing export + event log join.",
    claimId: "gcp-billing-export-bq",
  },
  "85-agents": {
    services: ["Vertex AI Agent Builder", "Gemini function calling"],
    storage: "N/A — reads the Module 20 vector index and calls tools at request time",
    snippet: `from vertexai.generative_models import GenerativeModel, Tool, FunctionDeclaration\n\nsearch_docs = FunctionDeclaration(\n    name="search_docs",\n    description="Search the indexed document store for relevant chunks",\n    parameters={"type": "object", "properties": {"query": {"type": "string"}}},\n)\nmodel = GenerativeModel("gemini-3-flash", tools=[Tool(function_declarations=[search_docs])])\nresponse = model.generate_content(user_message)\n# response.candidates[0].function_calls -> runtime executes search_docs, feeds result back`,
    labSteps: [
      "Wrap the Module 25 retrieval call as a function-calling tool and register it with a Gemini agent in Vertex AI Agent Builder.",
      "Give the agent a multi-step task ('find X, then summarize how it changed across the last two documents') and trace the plan-act-observe loop.",
      "Cap the agent at a fixed iteration budget and confirm it stops instead of looping indefinitely on an unanswerable task.",
      "Add a human-approval gate before any tool call with a side effect (e.g. sending an email) and verify the agent pauses for it.",
    ],
    costNote: "~$0.03 for a handful of agent turns with tool calls on the fast tier.",
    claimId: "gcp-vertex-agent-builder",
  },
};
