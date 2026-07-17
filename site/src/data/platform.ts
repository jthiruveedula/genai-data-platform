import type { CloudId } from "./modules";

/** Labels shown for a concept before any cloud is selected. */
export type CloudLabelMap = Record<CloudId | "neutral", string>;

/**
 * The document lifecycle the whole homepage narrates: one document travelling
 * source → grounded answer. Each stage carries its service name per cloud so
 * the architecture story, hero canvas, and flavor deck all re-label live when
 * the visitor switches clouds (single source of truth — redesign requirement
 * "architecture labels, service names ... must update reliably").
 */
export interface LifecycleStage {
  id: string;
  /** Short HUD label, uppercase mono chip. */
  label: string;
  /** One-sentence narration shown while the stage is active in the story. */
  narration: string;
  services: CloudLabelMap;
}

export const LIFECYCLE: LifecycleStage[] = [
  {
    id: "sources",
    label: "SOURCES",
    narration: "A messy PDF, a ticket thread, a crawled page — raw knowledge enters the platform.",
    services: {
      neutral: "Docs · tickets · web crawls",
      gcp: "Docs · tickets · crawl4ai on Cloud Run",
      aws: "Docs · tickets · crawl4ai on Fargate",
      azure: "Docs · tickets · crawl4ai on Container Apps",
      oss: "Docs · tickets · crawl4ai on K8s",
    },
  },
  {
    id: "ingest",
    label: "INGEST",
    narration: "Pipelines land every document in object storage with metadata — idempotent, incremental, auditable.",
    services: {
      neutral: "Ingestion pipeline → object storage",
      gcp: "Dataflow → Cloud Storage + BigQuery",
      aws: "Glue → S3 + Athena catalog",
      azure: "Data Factory → ADLS Gen2",
      oss: "Airflow → MinIO + Postgres",
    },
  },
  {
    id: "chunk",
    label: "PARSE + CHUNK",
    narration: "Layout-aware parsing splits the document at semantic boundaries — chunk size choices echo all the way to answer quality.",
    services: {
      neutral: "Parser + recursive chunker",
      gcp: "Document AI → chunk rows in BigQuery",
      aws: "Textract → chunk JSON in S3",
      azure: "AI Document Intelligence → chunks",
      oss: "Docling / unstructured.io → chunks",
    },
  },
  {
    id: "embed",
    label: "EMBED",
    narration: "Each chunk collapses into a vector — meaning becomes geometry.",
    services: {
      neutral: "Embedding model",
      gcp: "Vertex AI gemini-embedding-001",
      aws: "Bedrock Titan Embeddings v2",
      azure: "Azure OpenAI embeddings",
      oss: "BGE via TEI (Text Embeddings Inference)",
    },
  },
  {
    id: "index",
    label: "VECTOR DB",
    narration: "Vectors settle into an index where similar meanings cluster together.",
    services: {
      neutral: "Vector index",
      gcp: "Vertex AI Vector Search",
      aws: "OpenSearch Serverless (k-NN)",
      azure: "Azure AI Search",
      oss: "Qdrant on K8s",
    },
  },
  {
    id: "retrieve",
    label: "RETRIEVE",
    narration: "A question drops into the same space — hybrid search pulls the nearest chunks out by meaning and keyword.",
    services: {
      neutral: "Hybrid search (dense + keyword)",
      gcp: "Vector Search hybrid (dense + sparse)",
      aws: "OpenSearch hybrid (BM25 + k-NN)",
      azure: "AI Search hybrid + semantic ranking",
      oss: "Qdrant dense + BM25 fusion",
    },
  },
  {
    id: "rerank",
    label: "RERANK",
    narration: "A cross-encoder re-orders the top candidates — 'similar' becomes 'actually relevant'.",
    services: {
      neutral: "Cross-encoder reranker",
      gcp: "Vertex AI Ranking API",
      aws: "Bedrock reranker models",
      azure: "AI Search semantic ranker",
      oss: "BGE cross-encoder reranker",
    },
  },
  {
    id: "assemble",
    label: "ASSEMBLE",
    narration: "The winning chunks are woven into a prompt with citations pinned to their source pages.",
    services: {
      neutral: "Prompt assembly + citations",
      gcp: "Cloud Run RAG API",
      aws: "Lambda + API Gateway RAG API",
      azure: "Container Apps RAG API",
      oss: "FastAPI on K8s",
    },
  },
  {
    id: "llm",
    label: "LLM",
    narration: "A fast model answers from the retrieved context — escalating to a reasoning tier only when it must.",
    services: {
      neutral: "Fast LLM (+ reasoning escalation)",
      gcp: "Gemini 3 Flash on Vertex AI",
      aws: "Claude Haiku 4.5 on Bedrock",
      azure: "Azure OpenAI fast tier",
      oss: "Llama / Qwen on vLLM",
    },
  },
  {
    id: "answer",
    label: "GROUNDED ANSWER",
    narration: "The answer arrives with citations back to the original page — every claim traceable, every token metered.",
    services: {
      neutral: "Cited answer + event log",
      gcp: "Answer + event log in BigQuery",
      aws: "Answer + logs in CloudWatch/Athena",
      azure: "Answer + logs in Log Analytics",
      oss: "Answer + traces in Langfuse",
    },
  },
];

/** "Trusted concepts" row under the hero CTAs. */
export const CONCEPTS = ["RAG", "RETRIEVAL", "EMBEDDINGS", "EVALS", "GUARDRAILS", "SERVING"] as const;

/**
 * Per-cloud visual/story personality for the flavor deck. Accent colors come
 * from the token system (data-cloud), not from here — this is copy only.
 */
export interface CloudPersonality {
  id: CloudId;
  name: string;
  archetype: string;
  thesis: string;
  stack: string[];
  signal: string;
}

export const PERSONALITIES: CloudPersonality[] = [
  {
    id: "gcp",
    name: "Google Cloud",
    archetype: "ANALYTICS-NATIVE",
    thesis: "Your warehouse becomes your RAG substrate — embeddings, vectors, and event logs live beside your analytics in BigQuery.",
    stack: ["Vertex AI", "BigQuery", "Document AI", "Cloud Run"],
    signal: "Best when data gravity is already in BigQuery",
  },
  {
    id: "aws",
    name: "AWS",
    archetype: "BROAD ECOSYSTEM",
    thesis: "Every primitive at every scale — compose Bedrock, OpenSearch, and serverless glue into exactly the platform you need.",
    stack: ["Bedrock", "OpenSearch", "S3 + Glue", "Lambda"],
    signal: "Best when your org is standardized on AWS",
  },
  {
    id: "azure",
    name: "Azure",
    archetype: "ENTERPRISE COPILOT",
    thesis: "Identity, governance, and Microsoft 365 gravity — the shortest path from enterprise documents to a compliant copilot.",
    stack: ["Azure OpenAI", "AI Search", "Document Intelligence", "Entra ID"],
    signal: "Best for Microsoft/enterprise estates",
  },
  {
    id: "oss",
    name: "Open Source",
    archetype: "FULL CONTROL",
    thesis: "No lock-in, no metered tokens — open-weight models and OSS infrastructure you can inspect, tune, and run anywhere.",
    stack: ["vLLM", "Qdrant", "Airflow", "Langfuse"],
    signal: "Best for sovereignty and customization",
  },
];

/** Preset scenarios for the cost console. */
export interface CostScenario {
  id: string;
  label: string;
  caption: string;
  docs: number;
  queriesPerDay: number;
  avgTokens: number;
}

export const COST_SCENARIOS: CostScenario[] = [
  { id: "pilot", label: "PILOT", caption: "One team, one corpus", docs: 500, queriesPerDay: 200, avgTokens: 1500 },
  { id: "production", label: "PRODUCTION", caption: "Org-wide assistant", docs: 5000, queriesPerDay: 1000, avgTokens: 2000 },
  { id: "scale", label: "SCALE", caption: "Multi-tenant platform", docs: 10000, queriesPerDay: 5000, avgTokens: 3000 },
];

/** Proof panels for the "why this matters" section. */
export interface Outcome {
  title: string;
  description: string;
  chip: string;
}

export const OUTCOMES: Outcome[] = [
  {
    title: "A working RAG API with citations",
    description: "Not a toy notebook — a deployed endpoint that answers from your documents and cites the exact chunk it used.",
    chip: "WEEKEND 1",
  },
  {
    title: "An event log you can operate on",
    description: "Every request, retrieval, and token accounted for — the raw material for dashboards, evals, and A/B tests.",
    chip: "EVERY QUERY LOGGED",
  },
  {
    title: "A cost model you can defend",
    description: "Unit economics per query and per tenant, tied to the exact services you chose — before finance asks.",
    chip: "< $10 LAB SPEND",
  },
];
