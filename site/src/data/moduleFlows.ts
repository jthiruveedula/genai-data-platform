/**
 * Per-module "micro-pipeline" diagram data: 4-5 steps that show the
 * mechanism specific to that module (not a repeat of the homepage's
 * 10-stage lifecycle schematic, which is the whole-platform view).
 * Rendered by ModuleFlowDiagram.astro, one static diagram per module page.
 */

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
