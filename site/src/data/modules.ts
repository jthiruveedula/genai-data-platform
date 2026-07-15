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
}

export const MODULES: Module[] = [
  {
    id: "00-foundations",
    order: 0,
    title: "Foundations",
    path: "beginner",
    summary:
      "Tokens, embeddings intuition, vector similarity, context windows, and RAG vs. fine-tuning vs. long-context — the vocabulary every later module assumes.",
  },
  {
    id: "10-ingestion",
    order: 10,
    title: "Ingestion",
    path: "beginner",
    summary:
      "Pull data from docs, tickets, chats, DBs, and the web into object storage and tables — the first stage of the pipeline, and the one every later stage depends on.",
  },
  {
    id: "15-chunking",
    order: 15,
    title: "Chunking",
    path: "beginner",
    summary:
      "Split ingested documents into retrievable pieces — fixed, recursive, semantic, or layout-aware — and see how chunk size and overlap choices show up later as retrieval quality.",
  },
];
