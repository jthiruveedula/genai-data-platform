export type CloudId = "gcp" | "aws" | "azure" | "oss";

export const CLOUDS: { id: CloudId; label: string; tagline: string; bestFor: string }[] = [
  { id: "gcp", label: "GCP", tagline: "Vertex AI + BigQuery", bestFor: "Best for teams already on BigQuery/analytics" },
  { id: "aws", label: "AWS", tagline: "Bedrock + OpenSearch", bestFor: "Best for teams standardized on AWS" },
  { id: "azure", label: "Azure", tagline: "Azure OpenAI + AI Search", bestFor: "Best for Microsoft/enterprise shops" },
  { id: "oss", label: "OSS", tagline: "vLLM + Qdrant on K8s", bestFor: "Best for full control, no cloud lock-in" },
];

export interface Module {
  id: string;
  order: number;
  title: string;
  path: "beginner" | "intermediate" | "advanced";
  summary: string;
  claimId?: string;
  /** Rough reading + lab time in minutes — a planning estimate, not a promise. */
  estimatedMinutes: number;
}

export const MODULES: Module[] = [
  {
    id: "00-foundations",
    order: 0,
    title: "Foundations",
    path: "beginner",
    summary:
      "Tokens, embeddings intuition, vector similarity, context windows, and RAG vs. fine-tuning vs. long-context — the vocabulary every later module assumes.",
    estimatedMinutes: 20,
  },
  {
    id: "10-ingestion",
    order: 10,
    title: "Ingestion",
    path: "beginner",
    summary:
      "Pull data from docs, tickets, chats, DBs, and the web into object storage and tables — the first stage of the pipeline, and the one every later stage depends on.",
    estimatedMinutes: 20,
  },
  {
    id: "15-chunking",
    order: 15,
    title: "Chunking",
    path: "beginner",
    summary:
      "Split ingested documents into retrievable pieces — fixed, recursive, semantic, or layout-aware — and see how chunk size and overlap choices show up later as retrieval quality.",
    estimatedMinutes: 25,
  },
  {
    id: "20-embeddings",
    order: 20,
    title: "Embeddings & vector store",
    path: "beginner",
    summary:
      "Turn each chunk into a vector, store it in an index, and see semantically similar chunks cluster together in vector space — the step that makes retrieval possible at all.",
    estimatedMinutes: 25,
  },
  {
    id: "25-serving",
    order: 25,
    title: "Serving a RAG API",
    path: "beginner",
    summary:
      "Wire retrieval and an LLM together behind an API: embed the query, fetch nearest chunks, build a prompt with citations, call a fast model — your first complete, working RAG pipeline.",
    estimatedMinutes: 30,
  },
  {
    id: "35-retrieval",
    order: 35,
    title: "Retrieval quality",
    path: "intermediate",
    summary:
      "Hybrid search, rerankers, query rewriting, and HyDE — the techniques that turn 'similar embedding' into 'actually relevant answer,' measured with recall and precision.",
    estimatedMinutes: 35,
  },
  {
    id: "45-evaluation",
    order: 45,
    title: "Evaluation",
    path: "intermediate",
    summary:
      "Golden datasets, RAGAS-style faithfulness and relevance metrics, and LLM-as-judge calibrated against human labels — the discipline that turns 'looks good to me' into a number you can gate a deploy on.",
    estimatedMinutes: 35,
  },
  {
    id: "55-observability",
    order: 55,
    title: "Observability for LLMs",
    path: "intermediate",
    summary:
      "Trace a query through retrieval, prompt assembly, and completion as one span tree, account for every token, and watch the event log become the analytical backbone the rest of the platform reads from.",
    estimatedMinutes: 35,
  },
  {
    id: "65-security",
    order: 65,
    title: "Security for GenAI",
    path: "advanced",
    summary:
      "Prompt injection, cross-tenant data leaks through missing retrieval filters, and untrusted model output rendered as HTML — the OWASP LLM Top 10 risks that a working RAG pipeline doesn't defend against by default.",
    estimatedMinutes: 35,
  },
  {
    id: "75-finops",
    order: 75,
    title: "FinOps for GenAI",
    path: "advanced",
    summary:
      "Turn the Module 55 event log into $/query and $/tenant unit economics, find out where the money actually goes, and use caching and model routing to bring the bill down without touching quality.",
    estimatedMinutes: 50,
  },
  {
    id: "85-agents",
    order: 85,
    title: "Agents & tool use",
    path: "advanced",
    summary:
      "Function calling, plan-act-observe loops, and MCP as the standard interface to tools and data — where agents beat single-hop RAG, where they don't, and how to keep a tool-using model on a short leash.",
    estimatedMinutes: 35,
  },
];
