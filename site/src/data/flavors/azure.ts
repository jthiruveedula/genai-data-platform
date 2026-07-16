import type { CloudId } from "../modules";
import type { FlavorEntry } from "./gcp";

export const cloud: CloudId = "azure";

export const flavor: Record<string, FlavorEntry> = {
  "00-foundations": {
    services: ["Azure OpenAI"],
    storage: "N/A (concepts only)",
    snippet: `# No cloud calls in this module — pure concepts.\n# Azure AI Foundry model catalog is where you'll pick embedding + LLM models later.`,
    labSteps: [
      "Read the concept page and glossary.",
      "Open Azure AI Foundry and browse the model catalog (no calls made).",
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
    services: ["Azure Functions", "Azure OpenAI (GPT-4o mini)"],
    storage: "N/A — reads the Module 20 Azure AI Search index at request time",
    snippet: `@app.route(route="ask")\ndef ask(req: func.HttpRequest) -> func.HttpResponse:\n    query_vec = embed(req.get_json()["question"])\n    neighbors = search_client.search(vector_queries=[{"vector": query_vec, "k": 5, "fields": "embedding"}])\n    prompt = build_prompt(req.get_json()["question"], neighbors)\n    response = client.chat.completions.create(model="gpt-4o-mini", messages=prompt)\n    return func.HttpResponse(json.dumps({"answer": response, "citations": [n["chunk_id"] for n in neighbors]}))`,
    labSteps: [
      "Deploy an Azure Function wrapping embed -> retrieve -> prompt -> GPT-4o mini.",
      "Ask a question your Module 10 documents can answer; confirm the response cites a real chunk.",
      "Ask an out-of-scope question; confirm the model says it doesn't know instead of guessing.",
      "Log every request/response pair — this becomes the event log Module 30 builds dashboards on.",
    ],
    costNote: "~$0.01 per query (GPT-4o mini) + negligible Functions cost at low volume.",
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
};
