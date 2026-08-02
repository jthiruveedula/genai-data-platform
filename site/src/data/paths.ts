export interface PathInfo {
  id: "beginner" | "intermediate" | "advanced";
  label: string;
  laneLabel: "CORE" | "DEEPEN" | "SCALE";
  weeks: string;
  outcome: string;
  description: string;
  /** 3-4 short "you will be able to..." capability chips (redesign phase 2,
   *  issue #148) — rendered above the module rail on the path page. */
  capabilities: string[];
}

export const PATHS: PathInfo[] = [
  {
    id: "beginner",
    label: "Beginner",
    laneLabel: "CORE",
    weeks: "Weeks 1–2",
    outcome: "a working single-source RAG with citations",
    description:
      "You're the first GenAI engineer at your company. Start from the vocabulary — tokens, embeddings, chunking — and build up to an API that answers questions from your own documents and shows its sources.",
    capabilities: [
      "Ship a cited RAG API from your own documents",
      "Explain tokens, embeddings, and chunking to a skeptical colleague",
      "Pick a cloud stack and have something running by the weekend",
    ],
  },
  {
    id: "intermediate",
    label: "Intermediate",
    laneLabel: "DEEPEN",
    weeks: "Weeks 3–5",
    outcome: "a production-shaped pipeline with quality gates",
    description:
      "You own quality and trust. Turn a working demo into something you'd trust in front of users: hybrid retrieval, a golden-dataset eval suite, and the observability to see why an answer was wrong.",
    capabilities: [
      "Run a golden-dataset eval suite that gates deploys",
      "Trace a bad answer back to the exact retrieval step that caused it",
      "Explain why an answer was wrong, not just that it was",
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    laneLabel: "SCALE",
    weeks: "Weeks 6–8",
    outcome: "a governed, multi-agent system safe to put in front of a real customer or employee",
    description:
      "You run the platform other teams build agents on. Close the gaps a single-tenant pipeline doesn't have to face — prompt injection and cross-tenant leaks, per-tenant unit economics, and agents that call tools without going rogue.",
    capabilities: [
      "Ship an agent with a bounded, capped tool-call loop",
      "Defend against prompt injection and cross-tenant data leaks",
      "Account for cost and approvals on a per-tenant basis",
    ],
  },
];
