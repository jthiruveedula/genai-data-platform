export interface PathInfo {
  id: "beginner" | "intermediate" | "advanced";
  label: string;
  laneLabel: "CORE" | "DEEPEN" | "SCALE";
  weeks: string;
  outcome: string;
  description: string;
}

export const PATHS: PathInfo[] = [
  {
    id: "beginner",
    label: "Beginner",
    laneLabel: "CORE",
    weeks: "Weeks 1–2",
    outcome: "a working single-source RAG with citations",
    description:
      "Start from the vocabulary — tokens, embeddings, chunking — and build up to an API that answers questions from your own documents and shows its sources.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    laneLabel: "DEEPEN",
    weeks: "Weeks 3–5",
    outcome: "a production-shaped pipeline with quality gates",
    description:
      "Turn a working demo into something you'd trust in front of users: hybrid retrieval, a golden-dataset eval suite, and the observability to see why an answer was wrong.",
  },
  {
    id: "advanced",
    label: "Advanced",
    laneLabel: "SCALE",
    weeks: "Weeks 6–8",
    outcome: "a platform-grade, multi-tenant deployment",
    description:
      "Close the gaps a single-tenant pipeline doesn't have to face — prompt injection and cross-tenant leaks, per-tenant unit economics, and agents that call tools without going rogue.",
  },
];
