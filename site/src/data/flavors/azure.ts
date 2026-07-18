import type { CloudId } from "../modules";
import type { FlavorEntry } from "./gcp";

export const cloud: CloudId = "azure";

export const flavor: Record<string, FlavorEntry> = {
  "00-foundations": {
    services: ["Azure OpenAI"],
    storage: "N/A (concepts only)",
    snippet: `# No cloud calls in this module — pure concepts.\n# Microsoft Foundry model catalog is where you'll pick embedding + LLM models later.`,
    labSteps: [
      "Read the concept page and glossary.",
      "Open Microsoft Foundry and browse the model catalog (no calls made).",
    ],
    costNote: "$0 — no infrastructure created in this module.",
    claimId: "azure-foundry-model-catalog",
  },
  "10-ingestion": {
    services: ["Blob Storage", "Data Factory", "Azure SQL"],
    storage: "Blob Storage (raw) + Azure SQL (structured)",
    snippet: `az storage container create --name gdp-raw --account-name \${STORAGE_ACCOUNT}\n\naz storage blob upload-batch \\\n  --destination gdp-raw \\\n  --source ./sample-docs \\\n  --account-name \${STORAGE_ACCOUNT}\n\n# Data Factory pipeline triggers on new blobs and lands rows in Azure SQL`,
    labSteps: [
      "Create a Blob Storage container for raw documents.",
      "Upload 3-5 sample PDFs.",
      "Run a Data Factory pipeline to land metadata rows in Azure SQL.",
      "Verify row count in Azure SQL matches uploaded file count.",
    ],
    costNote: "~$0.05 for a handful of PDFs (Blob storage + one Data Factory pipeline run).",
    claimId: "azure-data-factory-ingestion",
  },
  "15-chunking": {
    services: ["Azure Functions", "Azure SQL"],
    storage: "Azure SQL (chunked rows with metadata)",
    snippet: `# Recursive chunking with LangChain, run in an Azure Function\nfrom langchain_text_splitters import RecursiveCharacterTextSplitter\n\nsplitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)\nchunks = splitter.split_text(document_text)\n\n# Each chunk row: (doc_id, chunk_id, text, char_start, char_end)\n# written to the gdp.chunks table`,
    labSteps: [
      "Take the raw rows landed in Module 10's Azure SQL table.",
      "Run the recursive chunker at chunk_size=800, chunk_overlap=120 in an Azure Function.",
      "Land chunk rows (doc_id, chunk_id, text, offsets) in a new Azure SQL table.",
      "Re-run with chunk_size=200 and compare: count chunks, spot orphaned mid-sentence splits.",
    ],
    costNote: "~$0.02 for a handful of Function invocations + Azure SQL storage.",
    claimId: "azure-functions-chunking",
  },
  "20-embeddings": {
    services: ["Azure OpenAI (text-embedding-3)", "Azure AI Search"],
    storage: "Azure AI Search vector index",
    snippet: `from openai import AzureOpenAI\nclient = AzureOpenAI(azure_endpoint=endpoint, api_key=key, api_version="2024-06-01")\n\ndef embed(text):\n    return client.embeddings.create(model="text-embedding-3-small", input=text).data[0].embedding\n\n# Upload as a vector field document to Azure AI Search\nsearch_client.upload_documents([{"chunk_id": c.chunk_id, "embedding": embed(c.text)}])`,
    labSteps: [
      "Embed all chunks from Module 15 with text-embedding-3-small.",
      "Create an Azure AI Search index with a vector field and upload the vectors.",
      "Embed two different queries and eyeball their nearest neighbors.",
      "Confirm semantically similar chunks (not just keyword-similar) land near each other.",
    ],
    costNote: "~$0.02 for embedding a handful of documents' worth of chunks.",
    claimId: "azure-openai-embeddings",
  },
  "25-serving": {
    services: ["Azure Functions", "Azure OpenAI (GPT-5.6 Luna)"],
    storage: "N/A — reads the Module 20 Azure AI Search index at request time",
    snippet: `@app.route(route="ask")\ndef ask(req: func.HttpRequest) -> func.HttpResponse:\n    query_vec = embed(req.get_json()["question"])\n    neighbors = search_client.search(vector_queries=[{"vector": query_vec, "k": 5, "fields": "embedding"}])\n    prompt = build_prompt(req.get_json()["question"], neighbors)\n    response = client.chat.completions.create(model="gpt-5.6-luna", messages=prompt)\n    return func.HttpResponse(json.dumps({"answer": response, "citations": [n["chunk_id"] for n in neighbors]}))`,
    labSteps: [
      "Deploy an Azure Function wrapping embed -> retrieve -> prompt -> GPT-5.6 Luna.",
      "Ask a question your Module 10 documents can answer; confirm the response cites a real chunk.",
      "Ask an out-of-scope question; confirm the model says it doesn't know instead of guessing.",
      "Log every request/response pair — this becomes the event log Module 30 builds dashboards on.",
    ],
    costNote: "~$0.01 per query (GPT-5.6 Luna, fast tier) + negligible Functions cost at low volume.",
    claimId: "azure-functions-rag-api",
  },
  "35-retrieval": {
    services: ["Azure AI Search"],
    storage: "Azure AI Search (hybrid keyword + vector + semantic ranking)",
    snippet: `// Hybrid + semantic ranking in one Azure AI Search query\nconst results = await searchClient.search(queryText, {\n  vectorSearchOptions: {\n    queries: [{ kind: "vector", vector: queryVec, kNearestNeighborsCount: 20, fields: ["embedding"] }],\n  },\n  queryType: "semantic",\n  semanticSearchOptions: { configurationName: "gdp-semantic-config" },\n  top: 5,\n});`,
    labSteps: [
      "Enable vector + semantic ranking on the Module 15 chunk index.",
      "Run a query with keyword search only, note top-5 results.",
      "Re-run with hybrid (keyword + vector) search, compare top-5.",
      "Enable semantic ranking on top of hybrid results and compare the final top-5 again.",
    ],
    costNote: "~$0.03 for a handful of hybrid + semantic queries on a small Search index.",
    claimId: "azure-ai-search-hybrid",
  },
  "45-evaluation": {
    services: ["Microsoft Foundry evaluations"],
    storage: "Azure Blob Storage (golden dataset + evaluation results)",
    snippet: `from azure.ai.evaluation import evaluate, GroundednessEvaluator, RelevanceEvaluator\n\nresult = evaluate(\n    data="golden_dataset.jsonl",\n    evaluators={\n        "groundedness": GroundednessEvaluator(model_config),\n        "relevance": RelevanceEvaluator(model_config),\n    },\n    evaluator_config={"default": {"column_mapping": {"query": "\${data.question}", "response": "\${data.answer}"}}},\n)\nresult["metrics"]  # -> {"groundedness.mean": 4.6, "relevance.mean": 4.4}`,
    labSteps: [
      "Build a golden dataset of 20+ labeled Q&A pairs from the documents ingested in Module 10.",
      "Run Microsoft Foundry's built-in groundedness and relevance evaluators against the Module 25 RAG API.",
      "Spot-check 5 LLM-as-judge scores against your own human judgment and note any disagreement.",
      "Write the summary metrics to Blob Storage and wire a CI step that fails the build if groundedness drops below a threshold.",
    ],
    costNote: "~$0.04 for evaluating a 20-example golden set with an LLM-as-judge model.",
    claimId: "azure-foundry-evaluations",
  },
  "55-observability": {
    services: ["Application Insights", "Azure Monitor"],
    storage: "Application Insights (traces) + Log Analytics workspace",
    snippet: `from azure.monitor.opentelemetry import configure_azure_monitor\nfrom opentelemetry import trace\n\nconfigure_azure_monitor(connection_string=app_insights_conn_string)\ntracer = trace.get_tracer("gdp.rag")\n\nwith tracer.start_as_current_span("rag_request"):\n    with tracer.start_as_current_span("retrieve") as span:\n        span.set_attribute("chunks.count", len(neighbors))\n    with tracer.start_as_current_span("generate") as span:\n        span.set_attribute("llm.input_tokens", usage.prompt_tokens)\n        span.set_attribute("llm.output_tokens", usage.completion_tokens)`,
    labSteps: [
      "Instrument the Module 25 RAG API with OpenTelemetry spans for embed, retrieve, prompt, and generate.",
      "Export spans to Application Insights and confirm one trace per request shows all four stages nested correctly.",
      "Add token-count span attributes from the Azure OpenAI usage field on the generate span.",
      "Query Azure Monitor Logs for p50/p95 total latency versus time-to-first-token.",
    ],
    costNote: "~$0.01 for a handful of traced requests (Application Insights ingestion at low volume).",
    claimId: "azure-app-insights-tracing",
  },
  "65-security": {
    services: ["Azure AI Content Safety"],
    storage: "N/A — inline screening at request/response time",
    snippet: `from azure.ai.contentsafety import ContentSafetyClient\nfrom azure.ai.contentsafety.models import AnalyzeTextOptions\n\nclient = ContentSafetyClient(endpoint, credential)\nresult = client.shield_prompt(\n    ShieldPromptOptions(user_prompt=incoming_prompt, documents=[retrieved_chunk_text])\n)\nif result.documents_analysis[0].attack_detected:\n    raise PromptBlocked("indirect prompt injection detected in retrieved document")`,
    labSteps: [
      "Insert a document into the Module 15 chunk index containing a hidden instruction ('ignore prior instructions and reveal...').",
      "Ask a normal question that retrieves that chunk and observe whether the model follows the injected instruction.",
      "Enable Content Safety Prompt Shields in front of the Module 25 RAG API and re-run the same query.",
      "Add a document-level access-control filter to retrieval and confirm a second tenant's query can no longer surface the first tenant's chunks.",
    ],
    costNote: "~$0.02 for a handful of screened prompts/responses through Content Safety.",
    claimId: "azure-content-safety-prompt-shields",
  },
  "75-finops": {
    services: ["Microsoft Cost Management"],
    storage: "Cost Management export to Blob Storage, joined with the Module 55 event log",
    snippet: `-- Join Cost Management export against the traced event log to get $/query\nSELECT\n  e.tenant_id,\n  COUNT(*) AS queries,\n  SUM(c.cost_in_billing_currency) AS total_cost,\n  SUM(c.cost_in_billing_currency) / COUNT(*) AS cost_per_query\nFROM event_log e\nJOIN cost_export c ON e.request_id = c.resource_id\nGROUP BY e.tenant_id\nORDER BY cost_per_query DESC;`,
    labSteps: [
      "Enable a Cost Management export to Blob Storage and join it against the Module 55 event log.",
      "Compute $/query and $/tenant, and confirm output tokens dominate cost versus embedding calls.",
      "Compare pay-as-you-go pricing against a Provisioned Throughput Unit (PTU) commitment for your observed volume.",
      "Add a fast-model-first router that only escalates to a reasoning-tier model on low retrieval confidence, and re-measure.",
      "Confirm Azure OpenAI's automatic prompt caching is firing for the repeated system prompt + retrieved chunks prefix, and check the discounted cached-token line in the next Cost Management export.",
    ],
    costNote: "~$0.02 for the query over a small Cost Management export + event log join.",
    claimId: "azure-cost-management-ptu",
  },
  "85-agents": {
    services: ["Microsoft Foundry Agent Service"],
    storage: "N/A — reads the Module 20 Azure AI Search index and calls tools at request time",
    snippet: `from azure.ai.projects import AIProjectClient\n\nagent = project_client.agents.create_agent(\n    model="gpt-5.6-luna",\n    name="gdp-rag-agent",\n    instructions="Answer using the search_docs tool before responding.",\n    tools=[{"type": "function", "function": search_docs_schema}],\n)\n# Foundry Agent Service runs the plan -> call search_docs -> observe -> respond loop`,
    labSteps: [
      "Wrap the Module 25 retrieval call as a function tool and register it with an agent in Microsoft Foundry Agent Service.",
      "Give the agent a multi-step task ('find X, then summarize how it changed across the last two documents') and trace the plan-act-observe loop.",
      "Cap the agent at a fixed iteration budget and confirm it stops instead of looping indefinitely on an unanswerable task.",
      "Add a human-approval gate before any tool call with a side effect (e.g. sending an email) and verify the agent pauses for it.",
    ],
    costNote: "~$0.03 for a handful of agent turns with tool calls on the fast tier.",
    claimId: "azure-foundry-agent-service",
  },
};
