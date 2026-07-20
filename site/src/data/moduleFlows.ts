/**
 * Per-module "micro-pipeline" diagram data: 4-5 steps that show the
 * mechanism specific to that module (not a repeat of the homepage's
 * 10-stage lifecycle schematic, which is the whole-platform view).
 * Rendered by ModuleFlowDiagram.astro, one static diagram per module page.
 */
import type { CloudLabelMap } from "./platform";

export interface FlowStep {
  label: string;
  detail: string;
}

export interface ModuleFlow {
  kicker: string;
  steps: FlowStep[];
}

export const MODULE_FLOWS: Record<string, ModuleFlow> = {
  "00-foundations": {
    kicker: "TEXT TO VECTOR",
    steps: [
      { label: "Text", detail: "A raw string — a sentence, a policy clause" },
      { label: "Tokenizer", detail: "Splits it into sub-word pieces" },
      { label: "Tokens", detail: "~4 characters, ~¾ of a word each" },
      { label: "Embedding model", detail: "Maps tokens to one fixed-length vector" },
      { label: "Vector", detail: "Similar meaning lands close by" },
    ],
  },
  "10-ingestion": {
    kicker: "SOURCE TO TABLE",
    steps: [
      { label: "Sources", detail: "Docs, tickets, chats, DBs, the web" },
      { label: "Parse / OCR", detail: "Extract text and layout from each format" },
      { label: "Object storage", detail: "Raw files, keyed by a stable document ID" },
      { label: "Structured tables", detail: "Metadata: source, timestamp, access control" },
    ],
  },
  "15-chunking": {
    kicker: "DOCUMENT TO CHUNKS",
    steps: [
      { label: "Parsed document", detail: "Text plus layout from Module 10" },
      { label: "Splitter", detail: "Fixed, recursive, semantic, or layout-aware" },
      { label: "Chunks", detail: "Each small enough to embed meaningfully" },
      { label: "Overlap + metadata", detail: "Tail repeats forward; tagged with source" },
    ],
  },
  "20-embeddings": {
    kicker: "CHUNK TO INDEX",
    steps: [
      { label: "Chunk text", detail: "Output of Module 15's splitter" },
      { label: "Embedding model", detail: "Same model for index and query, always" },
      { label: "Vector", detail: "A fixed-length array of floats" },
      { label: "Vector index", detail: "ANN structure; similar vectors cluster" },
    ],
  },
  "25-serving": {
    kicker: "QUERY TO ANSWER",
    steps: [
      { label: "Query", detail: "The user's question, embedded" },
      { label: "Retrieve", detail: "Top-k nearest chunks from the index" },
      { label: "Prompt + citations", detail: "Chunks inserted with their source" },
      { label: "LLM call", detail: "Fast model, or escalate to a reasoning tier" },
      { label: "Streamed answer", detail: "First token as soon as it's ready" },
    ],
  },
  "35-retrieval": {
    kicker: "RECALL TO PRECISION",
    steps: [
      { label: "Query", detail: "Rewritten or expanded if needed (HyDE)" },
      { label: "Dense + sparse search", detail: "Vector similarity and BM25 keyword, in parallel" },
      { label: "Fuse (RRF)", detail: "Reciprocal rank fusion merges both lists" },
      { label: "Rerank", detail: "A cross-encoder re-orders the candidates" },
      { label: "Top-k", detail: "The chunks that actually survive scrutiny" },
    ],
  },
  "45-evaluation": {
    kicker: "OPINION TO NUMBER",
    steps: [
      { label: "Golden set", detail: "Curated questions with expected answers" },
      { label: "Run the pipeline", detail: "The same RAG path production uses" },
      { label: "Score", detail: "Recall, faithfulness, LLM-as-judge" },
      { label: "Gate", detail: "Below threshold blocks the deploy" },
    ],
  },
  "55-observability": {
    kicker: "REQUEST TO TRACE",
    steps: [
      { label: "Request", detail: "Incoming query, tagged with a trace ID" },
      { label: "Retrieve span", detail: "Logged: query, chunks returned, latency" },
      { label: "Generate span", detail: "Logged: prompt, tokens, model, cost" },
      { label: "Trace tree", detail: "One tree per request — replayable months later" },
    ],
  },
  "65-security": {
    kicker: "INPUT TO SAFE OUTPUT",
    steps: [
      { label: "Input", detail: "User or tool-provided text" },
      { label: "Screen", detail: "Catch prompt injection, strip PII" },
      { label: "Scoped retrieval", detail: "ACL-filtered to the caller's own tenant" },
      { label: "Output screen", detail: "Guardrails check what the model produced" },
      { label: "Safe response", detail: "Only what passed every gate" },
    ],
  },
  "75-finops": {
    kicker: "EVENT LOG TO ACTION",
    steps: [
      { label: "Event log", detail: "Every request, retrieval, and token" },
      { label: "Join billing", detail: "Match usage against the actual cloud bill" },
      { label: "Unit economics", detail: "$/query and $/tenant, not just a monthly total" },
      { label: "Route or cache", detail: "A cheaper model or a cache hit cuts the bill" },
    ],
  },
  "85-agents": {
    kicker: "GOAL TO ACTION",
    steps: [
      { label: "Goal", detail: "What the user actually wants done" },
      { label: "Plan", detail: "The model decides the next action" },
      { label: "Tool call", detail: "Budgeted — a runaway loop can't run free" },
      { label: "Observe", detail: "The result feeds back into the loop" },
      { label: "Answer or escalate", detail: "Done, or handed to a human approval step" },
    ],
  },
};

/**
 * The one real service each module actually runs on, per cloud — reused by
 * ModuleFlowDiagram (a "RUNS ON" line) and ModuleScenario (a "ON THIS CLOUD"
 * line) so both stop reading identically regardless of which cloud is
 * selected. Values are pulled from the same source as the "Try it in your
 * flavor" code walkthroughs (site/src/data/flavors/*.ts) and the homepage's
 * LIFECYCLE stage data — nothing invented here, just surfaced in one more
 * place.
 */
export const MODULE_CLOUD_SERVICE: Record<string, CloudLabelMap> = {
  "00-foundations": {
    neutral: "Embedding model",
    gcp: "Vertex AI gemini-embedding-001",
    aws: "Bedrock Titan Embeddings v2",
    azure: "Azure OpenAI embeddings",
    oss: "BGE via TEI (Text Embeddings Inference)",
  },
  "10-ingestion": {
    neutral: "Ingestion pipeline → object storage",
    gcp: "Dataflow → Cloud Storage + BigQuery",
    aws: "Glue → S3 + Athena catalog",
    azure: "Data Factory → ADLS Gen2",
    oss: "Airflow → MinIO + Postgres",
  },
  "15-chunking": {
    neutral: "Parser + recursive chunker",
    gcp: "Document AI → chunk rows in BigQuery",
    aws: "Textract → chunk JSON in S3",
    azure: "AI Document Intelligence → chunks",
    oss: "Docling / unstructured.io → chunks",
  },
  "20-embeddings": {
    neutral: "Embedding model",
    gcp: "Vertex AI gemini-embedding-001",
    aws: "Bedrock Titan Embeddings v2",
    azure: "Azure OpenAI embeddings",
    oss: "BGE via TEI (Text Embeddings Inference)",
  },
  "25-serving": {
    neutral: "Fast LLM (+ reasoning escalation)",
    gcp: "Gemini 3 Flash on Vertex AI",
    aws: "Claude Haiku 4.5 on Bedrock",
    azure: "Azure OpenAI fast tier",
    oss: "Llama / Qwen on vLLM",
  },
  "35-retrieval": {
    neutral: "Hybrid search (dense + keyword)",
    gcp: "Vector Search hybrid (dense + sparse)",
    aws: "OpenSearch hybrid (BM25 + k-NN)",
    azure: "AI Search hybrid + semantic ranking",
    oss: "Qdrant dense + BM25 fusion",
  },
  "45-evaluation": {
    neutral: "Evaluation suite",
    gcp: "Vertex AI evaluation",
    aws: "Bedrock evaluations",
    azure: "Microsoft Foundry evaluations",
    oss: "RAGAS + Langfuse",
  },
  "55-observability": {
    neutral: "Tracing + observability",
    gcp: "Cloud Trace",
    aws: "CloudWatch",
    azure: "Application Insights",
    oss: "Langfuse",
  },
  "65-security": {
    neutral: "Injection + PII guardrails",
    gcp: "Model Armor",
    aws: "Bedrock Guardrails",
    azure: "Azure AI Content Safety",
    oss: "Llama Guard",
  },
  "75-finops": {
    neutral: "Cost + usage export",
    gcp: "Cloud Billing export",
    aws: "Cost & Usage Report (CUR)",
    azure: "Microsoft Cost Management",
    oss: "OpenCost",
  },
  "85-agents": {
    neutral: "Agent orchestration",
    gcp: "Vertex AI Agent Builder",
    aws: "Bedrock Agents",
    azure: "Microsoft Foundry Agent Service",
    oss: "LiteLLM + MCP servers",
  },
};
