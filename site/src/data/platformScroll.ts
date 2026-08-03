/**
 * Content tables for the scroll-driven platform page (`/platform`).
 *
 * Every cloud-mapped list is indexed 0..4 where 0 is the cloud-agnostic
 * wording and 1..4 are GCP / AWS / AZURE / OSS — the same shape the design
 * prototype used, so one `cloud` value threads through every lookup.
 */

export type Stage = {
  /** Display name, e.g. "PARSE + CHUNK". */
  name: string;
  desc: string;
  /** [any, gcp, aws, azure, oss] */
  stack: [string, string, string, string, string];
  tag: string;
};

export const STAGES: Stage[] = [
  {
    name: "SOURCES",
    desc: "A messy PDF, a ticket thread, a crawled page — raw knowledge enters the platform.",
    stack: [
      "Docs · tickets · web crawls",
      "Docs · tickets · crawl4ai on Cloud Run",
      "Docs · tickets · crawl4ai on Fargate",
      "Docs · tickets · crawl4ai on Container Apps",
      "Docs · tickets · crawl4ai on K8s",
    ],
    tag: "RAW",
  },
  {
    name: "INGEST",
    desc: "Pipelines land every document in object storage with metadata — idempotent, incremental, auditable.",
    stack: [
      "Ingestion pipeline → object storage",
      "Dataflow → Cloud Storage + BigQuery",
      "Glue → S3 + Athena catalog",
      "Data Factory → ADLS Gen2",
      "Airflow → MinIO + Postgres",
    ],
    tag: "LANDED",
  },
  {
    name: "PARSE + CHUNK",
    desc: "Layout-aware parsing splits the document at semantic boundaries — chunk size choices echo all the way to answer quality.",
    stack: [
      "Parser + recursive chunker",
      "Document AI → chunk rows in BigQuery",
      "Textract → chunk JSON in S3",
      "AI Document Intelligence → chunks",
      "Docling / unstructured.io → chunks",
    ],
    tag: "SPLIT",
  },
  {
    name: "EMBED",
    desc: "Each chunk collapses into a vector — meaning becomes geometry.",
    stack: [
      "Embedding model",
      "Vertex AI gemini-embedding-001",
      "Bedrock Titan Embeddings v2",
      "Azure OpenAI embeddings",
      "BGE via TEI",
    ],
    tag: "VECTORIZED",
  },
  {
    name: "VECTOR DB",
    desc: "Vectors settle into an index where similar meanings cluster together.",
    stack: [
      "Vector index",
      "Vertex AI Vector Search",
      "OpenSearch Serverless (k-NN)",
      "Azure AI Search",
      "Qdrant on K8s",
    ],
    tag: "INDEXED",
  },
  {
    name: "RETRIEVE",
    desc: "A question drops into the same space — hybrid search pulls the nearest chunks out by meaning and keyword.",
    stack: [
      "Hybrid search (dense + keyword)",
      "Vector Search hybrid (dense + sparse)",
      "OpenSearch hybrid (BM25 + k-NN)",
      "AI Search hybrid + semantic ranking",
      "Qdrant dense + BM25 fusion",
    ],
    tag: "CANDIDATES",
  },
  {
    name: "RERANK",
    desc: "A cross-encoder re-orders the top candidates — 'similar' becomes 'actually relevant'.",
    stack: [
      "Cross-encoder reranker",
      "Vertex AI Ranking API",
      "Bedrock reranker models",
      "AI Search semantic ranker",
      "BGE cross-encoder reranker",
    ],
    tag: "ORDERED",
  },
  {
    name: "ASSEMBLE",
    desc: "The winning chunks are woven into a prompt with citations pinned to their source pages.",
    stack: [
      "Prompt assembly + citations",
      "Cloud Run RAG API",
      "Lambda + API Gateway RAG API",
      "Container Apps RAG API",
      "FastAPI on K8s",
    ],
    tag: "PROMPT",
  },
  {
    name: "LLM",
    desc: "A fast model answers from the retrieved context — escalating to a reasoning tier only when it must.",
    stack: [
      "Fast LLM (+ reasoning escalation)",
      "Gemini 3 Flash on Vertex AI",
      "Claude Haiku 4.5 on Bedrock",
      "Azure OpenAI fast tier",
      "Llama / Qwen on vLLM",
    ],
    tag: "GENERATED",
  },
  {
    name: "GROUNDED ANSWER",
    desc: "The answer arrives with citations back to the original page — every claim traceable, every token metered.",
    stack: [
      "Cited answer + event log",
      "Answer + event log in BigQuery",
      "Answer + logs in CloudWatch/Athena",
      "Answer + logs in Log Analytics",
      "Answer + traces in Langfuse",
    ],
    tag: "CITED",
  },
];

export type AgentStep = {
  name: string;
  desc: string;
  stack: [string, string, string, string, string];
};

export const AGENT: AgentStep[] = [
  {
    name: "PLAN",
    desc: "The model decides its next step instead of just answering — a task, not a lookup.",
    stack: [
      "Agent planner",
      "Vertex AI Agent Builder",
      "Bedrock Agents / AgentCore",
      "Azure AI Foundry Agent Service",
      "LangGraph",
    ],
  },
  {
    name: "TOOL CALL",
    desc: "It calls a real tool — a ticket system, a warehouse query, a second retrieval pass.",
    stack: [
      "Function call / MCP tool",
      "Gemini function calling",
      "Bedrock tool use",
      "Azure OpenAI function calling",
      "MCP server",
    ],
  },
  {
    name: "OBSERVE",
    desc: "The result comes back as new input — the loop repeats, capped by an iteration budget.",
    stack: [
      "Observation → next plan",
      "Vertex AI Agent Builder",
      "Bedrock Agents / AgentCore",
      "Azure AI Foundry Agent Service",
      "LangGraph",
    ],
  },
];

export type SystemCell = { name: string; proto: string; call: string };

export const SYSTEMS: SystemCell[] = [
  { name: "Ticketing", proto: "MCP", call: 'mcp.call("tickets.search", { q, scope: tenant })' },
  { name: "CRM", proto: "FUNCTION CALL", call: "crm_lookup(account_id) · scoped service credential" },
  { name: "ERP", proto: "WEBHOOK", call: "POST /erp/hooks/agent — signed, replay-protected" },
  { name: "Internal APIs", proto: "FUNCTION CALL", call: "internal_api(path, params) · allowlisted routes only" },
  { name: "Document store", proto: "MCP", call: 'mcp.call("docs.fetch", { doc_id, page })' },
  { name: "Data warehouse", proto: "MCP", call: 'mcp.call("warehouse.query", { sql, row_limit })' },
];

export type Flavor = {
  short: string;
  kicker: string;
  name: string;
  desc: string;
  services: string[];
  best: string;
};

export const FLAVORS: Flavor[] = [
  {
    short: "GCP",
    kicker: "ANALYTICS-NATIVE",
    name: "Google Cloud",
    desc: "Your warehouse becomes your RAG substrate — embeddings, vectors, and event logs live beside your analytics in BigQuery.",
    services: ["Vertex AI", "BigQuery", "Document AI", "Cloud Run"],
    best: "Best when data gravity is already in BigQuery",
  },
  {
    short: "AWS",
    kicker: "BROAD ECOSYSTEM",
    name: "AWS",
    desc: "Every primitive at every scale — compose Bedrock, OpenSearch, and serverless glue into exactly the platform you need.",
    services: ["Bedrock", "OpenSearch", "S3 + Glue", "Lambda"],
    best: "Best when your org is standardized on AWS",
  },
  {
    short: "AZURE",
    kicker: "ENTERPRISE COPILOT",
    name: "Azure",
    desc: "Identity, governance, and Microsoft 365 gravity — the shortest path from enterprise documents to a compliant copilot.",
    services: ["Azure OpenAI", "AI Search", "Document Intelligence", "Entra ID"],
    best: "Best for Microsoft/enterprise estates",
  },
  {
    short: "OSS",
    kicker: "FULL CONTROL",
    name: "Open Source",
    desc: "No lock-in, no metered tokens — open-weight models and OSS infrastructure you can inspect, tune, and run anywhere.",
    services: ["vLLM", "Qdrant", "Airflow", "Langfuse"],
    best: "Best for sovereignty and customization",
  },
];

/** [role, [gcp, aws, azure, oss]] */
export const MAPPINGS: { role: string; values: [string, string, string, string] }[] = [
  {
    role: "VECTOR DB",
    values: ["Vertex AI Vector Search", "OpenSearch Serverless", "Azure AI Search", "Qdrant"],
  },
  {
    role: "EMBEDDINGS",
    values: ["gemini-embedding-001", "Titan Embeddings v2", "Azure OpenAI embeddings", "BGE via TEI"],
  },
  {
    role: "LLM",
    values: ["Gemini 3 Flash", "Claude Haiku 4.5", "Azure OpenAI fast tier", "Llama/Qwen on vLLM"],
  },
];

export type OpsPanel = {
  name: string;
  meta: string;
  rows: { label: string; val: string; ratio: number }[];
  note: string;
};

export const PANELS: OpsPanel[] = [
  {
    name: "TRACE",
    meta: "req_8f21a",
    rows: [
      { label: "PLAN", val: "120ms", ratio: 0.35 },
      { label: "TOOL CALL", val: "340ms", ratio: 1 },
      { label: "OBSERVE", val: "40ms", ratio: 0.12 },
    ],
    note: "Every plan → tool call → observe step, timed and costed.",
  },
  {
    name: "EVAL",
    meta: "golden set · 40",
    rows: [
      { label: "PASS · run-08-01-14", val: "0.94", ratio: 0.94 },
      { label: "PASS · run-08-01-13", val: "0.91", ratio: 0.91 },
      { label: "FAIL · run-08-01-12", val: "0.78", ratio: 0.78 },
    ],
    note: "Trajectory pass/fail, not just answer pass/fail.",
  },
  {
    name: "GOVERNANCE",
    meta: "3 pending",
    rows: [
      { label: "PENDING · Refund > $500", val: "HOLD", ratio: 0.5 },
      { label: "BLOCKED · PO to new vendor", val: "STOP", ratio: 0.85 },
      { label: "APPROVED · Contract redline", val: "OK", ratio: 0.3 },
    ],
    note: "Pending approvals and policy violations, in one queue.",
  },
  {
    name: "DEPLOY",
    meta: "v2026.08.02-3",
    rows: [
      { label: "dev", val: "OK", ratio: 1 },
      { label: "staging", val: "OK", ratio: 1 },
      { label: "prod", val: "ROLL", ratio: 0.6 },
    ],
    note: "dev → staging → prod, with a rollback that works.",
  },
];

export type CurriculumCard = {
  n: string;
  lane: "CORE" | "DEEPEN" | "SCALE";
  title: string;
  blurb: string;
  kind: string;
  time: string;
};

export const CURRICULUM: CurriculumCard[] = [
  { n: "01", lane: "CORE", title: "Foundations", blurb: "Tokens, embeddings intuition, vector similarity, context windows, RAG vs. fine-tuning.", kind: "CONCEPTS", time: "~20 MIN" },
  { n: "02", lane: "CORE", title: "Ingestion", blurb: "Pull data from docs, tickets, chats, DBs, and the web into object storage and tables.", kind: "LAB · ~$0.05", time: "~20 MIN" },
  { n: "03", lane: "CORE", title: "Chunking", blurb: "Fixed, recursive, semantic, or layout-aware — and how those choices resurface as retrieval quality.", kind: "LAB · ~$0.02", time: "~25 MIN" },
  { n: "04", lane: "CORE", title: "Embeddings & vector store", blurb: "Turn each chunk into a vector, store it in an index, watch similar chunks cluster.", kind: "LAB · ~$0.02", time: "~25 MIN" },
  { n: "05", lane: "CORE", title: "Serving a RAG API", blurb: "Embed the query, fetch nearest chunks, build a cited prompt, call a fast model.", kind: "SHIP AN API", time: "~30 MIN" },
  { n: "06", lane: "DEEPEN", title: "Retrieval quality", blurb: "Hybrid search, rerankers, query rewriting, and HyDE — measured with recall and precision.", kind: "LAB · ~$0.03", time: "~35 MIN" },
  { n: "07", lane: "DEEPEN", title: "Multi-modal ingestion", blurb: "HTML, PDF, and video don't reduce to clean text the same way — each needs its own path.", kind: "LAB", time: "~35 MIN" },
  { n: "08", lane: "DEEPEN", title: "Evaluation", blurb: "Golden datasets, faithfulness metrics, and LLM-as-judge calibrated against human labels.", kind: "LAB", time: "~35 MIN" },
  { n: "09", lane: "DEEPEN", title: "Observability for LLMs", blurb: "Trace a query as one span tree and account for every token in an event log.", kind: "LAB", time: "~35 MIN" },
  { n: "10", lane: "SCALE", title: "Security for GenAI", blurb: "Prompt injection, cross-tenant leaks, untrusted output — the OWASP LLM Top 10.", kind: "LAB", time: "~35 MIN" },
  { n: "11", lane: "SCALE", title: "FinOps for GenAI", blurb: "Turn the event log into $/query and $/tenant, then bring the bill down.", kind: "LAB", time: "~50 MIN" },
  { n: "12", lane: "SCALE", title: "Agents & tool use", blurb: "Function calling, plan-act-observe loops, and MCP as the standard interface to tools.", kind: "LAB", time: "~35 MIN" },
];

export type CostRow = {
  cloud: string;
  model: string;
  monthly: string;
  perQuery: string;
  ratio: number;
};

export const COSTS: CostRow[] = [
  { cloud: "GCP", model: "Gemini 3 Flash (fast tier)", monthly: "$31.58", perQuery: "$0.0053", ratio: 0.42 },
  { cloud: "AWS", model: "Claude Haiku 4.5 on Bedrock (fast tier)", monthly: "$64.81", perQuery: "$0.0108", ratio: 0.86 },
  { cloud: "AZURE", model: "GPT-5.6 Luna on Azure OpenAI (fast tier)", monthly: "$75.61", perQuery: "$0.0126", ratio: 1 },
  { cloud: "OSS", model: "Self-hosted open-weight model (GPU only)", monthly: "$73.92", perQuery: "$0.0123", ratio: 0.98 },
];

export const TIERS: { name: string; sub: string; note: string }[] = [
  { name: "PILOT", sub: "One team, one corpus", note: "Token cost barely matters yet — prove the pipeline works." },
  {
    name: "PRODUCTION",
    sub: "Org-wide assistant",
    note: "Token cost is now a real line item — this is where routing and caching earn their keep.",
  },
  {
    name: "SCALE",
    sub: "Multi-tenant platform",
    note: "Reliability and per-tenant accounting matter more than the per-token price.",
  },
];

export const STATS: { initial: string; target: number; suffix: string; prefix: string; label: string }[] = [
  { initial: "0", target: 4, suffix: "", prefix: "", label: "STACKS MAPPED" },
  { initial: "0", target: 10, suffix: "", prefix: "", label: "LIFECYCLE STAGES" },
  { initial: "0", target: 12, suffix: "", prefix: "", label: "MISSIONS LIVE" },
  { initial: "<$0", target: 10, suffix: "", prefix: "<$", label: "TOTAL LAB SPEND" },
];

/** Sub-label under each projected hero pipeline label. */
export const PIPE_NOTES = [
  "raw docs, tickets, crawls",
  "landed, versioned, auditable",
  "split at semantic boundaries",
  "text becomes geometry",
  "an index of meaning",
  "top-k by meaning + keyword",
  "'similar' becomes 'relevant'",
  "prompt with citation pins",
  "fast tier answers in context",
  "cited, traceable, metered",
];

export const CLOUD_NAMES = ["ANY CLOUD", "GCP", "AWS", "AZURE", "OSS"];

export const HERO_STACK = [
  "",
  "Vertex AI + BigQuery",
  "Bedrock + OpenSearch",
  "Azure OpenAI + AI Search",
  "vLLM + Qdrant on K8s",
];

export const TICKER_WORDS = [
  "RAG",
  "RETRIEVAL",
  "EMBEDDINGS",
  "EVALS",
  "GUARDRAILS",
  "SERVING",
  "ORCHESTRATION",
  "INTEGRATION",
  "GOVERNANCE",
];

export const NAV_LINKS = [
  { href: "#lifecycle", label: "Lifecycle" },
  { href: "#agent", label: "Agent" },
  { href: "#stacks", label: "Stacks" },
  { href: "#operate", label: "Operate" },
  { href: "#curriculum", label: "Curriculum" },
  { href: "#cost", label: "Cost" },
];
