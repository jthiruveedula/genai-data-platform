/**
 * Homepage FAQ: real objections an engineer evaluating this curriculum
 * would actually have, answered with specifics (numbers, page links,
 * module references) rather than generic reassurance.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ: FaqItem[] = [
  {
    question: "Why not just paste my documents into ChatGPT or Claude's context window?",
    answer:
      "Long-context stuffing works until your documents change — then you're re-uploading and re-paying for the same tokens on every query. Module 00 walks through the RAG-vs-fine-tuning-vs-long-context trade-off directly; the short version is RAG lets you swap the index when a document changes instead of the whole prompt, which is why this curriculum is RAG-first.",
  },
  {
    question: "Do I need a machine-learning background to start?",
    answer:
      "No. This assumes you can write code and use a cloud console, not that you've trained a model. Module 00 (Foundations) covers tokens, embeddings, and vector similarity from zero — every later module's vocabulary traces back to those five ideas.",
  },
  {
    question: "I already use LangChain or LlamaIndex — what does this add?",
    answer:
      "Those frameworks help you call retrieval and generation APIs. This curriculum is about what happens around that call in production: Module 45's evaluation gates, Module 55's per-request tracing, Module 65's tenant isolation, and Module 75's unit economics — the operating discipline a framework doesn't hand you by default.",
  },
  {
    question: "Which cloud should I pick if my company hasn't decided yet?",
    answer:
      "Start with whichever one you already have access to — the pipeline architecture is identical across all four, only the service names change (see the matrix page). If you're genuinely undecided, OSS (vLLM + Qdrant) is the most vendor-neutral starting point and every concept still transfers once a cloud is chosen.",
  },
  {
    question: "How much will I actually spend running the labs?",
    answer:
      "Under $10 total across every module at the fast-tier pricing verified on the freshness page — most modules cost a few cents each, and Module 00 costs nothing since it's concepts only. The cost console shows exact per-query numbers before you run anything.",
  },
  {
    question: "Won't this be outdated by the time I finish it?",
    answer:
      "Every pricing and service claim on this site is tracked in a single claim registry, re-checked on a schedule against its source, and stamped with a volatility rating — see the freshness page for the current count. When a model or price changes, the module citing it gets flagged, not silently left stale.",
  },
  {
    question: "What if my org uses a stack not listed here — Pinecone, Snowflake, Databricks?",
    answer:
      "The four flavors aren't the point — the pipeline stages are. Each module's 'services' mapping (Sources → Ingest → Chunk → Embed → Vector DB → Retrieve → LLM) is a pattern: find which of your own tools plays each role, the same way OSS substitutes Qdrant for a vector store and vLLM for a hosted model.",
  },
];
