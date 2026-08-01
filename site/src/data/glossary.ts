/**
 * Site-wide glossary — plain-English definitions for every piece of jargon
 * this curriculum assumes, aimed at "anyone without GenAI experience" per
 * PLAN.md §3.3's Module 00 spec ("glossary — site-wide hover tooltips"),
 * which was planned but never actually shipped. A dedicated page is the
 * lower-risk version of that idea: no auto-scanning/rewriting of already
 * shipped, tested prose across every module page, just one canonical,
 * linkable reference — same value for a newcomer, zero risk to existing
 * pages.
 */

export interface GlossaryTerm {
  term: string;
  definition: string;
  /** Module id where this concept is taught in depth, if any. */
  moduleId?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: "Token", definition: "The sub-word chunk an LLM actually reads and prices by — not a character, not a whole word. Roughly 4 characters or 3/4 of a word in English.", moduleId: "00-foundations" },
  { term: "Embedding", definition: "A list of numbers (a vector) representing a piece of text's meaning, positioned so that similar-meaning text lands near similar-meaning text in that number-space.", moduleId: "00-foundations" },
  { term: "Vector similarity", definition: "A distance measurement (usually cosine similarity) between two embeddings — the mechanism that lets a search find 'text about the same thing' without matching exact keywords.", moduleId: "00-foundations" },
  { term: "Context window", definition: "The maximum number of tokens (input + output combined) a single model call can hold. Everything retrieved, plus the conversation, plus the question, has to fit inside it.", moduleId: "00-foundations" },
  { term: "RAG (Retrieval-Augmented Generation)", definition: "Answering a question by first retrieving relevant text and handing it to the model as context, instead of relying only on what the model memorized during training.", moduleId: "00-foundations" },
  { term: "Fine-tuning", definition: "Retraining a model's own weights on your data, baking knowledge into the model itself — the alternative to RAG, and a worse fix for stale or missing data since it requires retraining, not just re-indexing.", moduleId: "00-foundations" },
  { term: "Ingestion", definition: "Getting raw content (documents, tickets, chats, web pages) into durable storage with enough metadata to track and re-process it later.", moduleId: "10-ingestion" },
  { term: "Idempotency", definition: "The property that re-running the same job twice doesn't create duplicate results — critical for ingestion jobs that might retry after a crash.", moduleId: "10-ingestion" },
  { term: "Chunk / Chunking", definition: "Splitting a document into smaller pieces small enough to embed meaningfully and retrieve independently. Where you cut matters as much as how small the pieces are.", moduleId: "15-chunking" },
  { term: "Parent-document retrieval", definition: "Embedding small chunks for precise search, but returning the larger surrounding section to the model — separating 'what matches' from 'what's enough context to answer.'", moduleId: "15-chunking" },
  { term: "Vector index / vector database", definition: "A data store built for one operation: find the K vectors closest to a given vector, fast, at scale (e.g. Qdrant, OpenSearch, pgvector, Vertex AI Vector Search).", moduleId: "20-embeddings" },
  { term: "Quantization", definition: "Compressing an embedding's precision (e.g. to 1 bit per dimension) to cut storage and search cost, trading a small, measurable amount of retrieval accuracy.", moduleId: "20-embeddings" },
  { term: "Matryoshka embeddings", definition: "Embedding models trained so the most important meaning is front-loaded into the first dimensions — letting you truncate the vector shorter with only a small accuracy cost.", moduleId: "20-embeddings" },
  { term: "Serving", definition: "The online request path: embed the question, retrieve chunks, build a prompt, call the model — everything that happens the instant a user actually asks something.", moduleId: "25-serving" },
  { term: "TTFT (time-to-first-token)", definition: "How long a user waits before the first word of a streamed response appears — the number that determines whether an answer feels instant or sluggish.", moduleId: "25-serving" },
  { term: "Streaming", definition: "Returning a model's output token-by-token as it's generated, instead of waiting for the full response before showing anything.", moduleId: "25-serving" },
  { term: "Hybrid search", definition: "Combining vector (semantic) similarity with keyword search (like BM25) in one query, so exact-term matches and meaning-based matches both count.", moduleId: "35-retrieval" },
  { term: "Reranking", definition: "Taking a larger set of retrieved candidates and re-scoring them with a more accurate (but slower) model, keeping only the best few before generation.", moduleId: "35-retrieval" },
  { term: "Multimodal", definition: "Handling more than one content type — text, images, audio, video — in the same embedding/retrieval/generation pipeline.", moduleId: "38-multimodal" },
  { term: "Golden dataset", definition: "A hand-labeled set of question/reference-answer pairs used as the fixed comparison point every evaluation metric runs against.", moduleId: "45-evaluation" },
  { term: "Faithfulness", definition: "An evaluation metric: does every claim in the generated answer actually trace back to the retrieved context, or is the model saying things it wasn't given?", moduleId: "45-evaluation" },
  { term: "LLM-as-judge", definition: "Using one LLM to score another LLM's output against a rubric — cheap and scalable, but needs periodic calibration against real human judgment.", moduleId: "45-evaluation" },
  { term: "Trajectory evaluation", definition: "For an agent: scoring whether the sequence of tool calls it made was correct, not just whether the final answer was — a faithful answer can still hide an unnecessary tool call.", moduleId: "45-evaluation" },
  { term: "Trace / span", definition: "A trace is everything that happened for one request; a span is one step inside it (embed, retrieve, generate). Nesting spans under one trace ID makes a bad request debuggable.", moduleId: "55-observability" },
  { term: "Prompt injection", definition: "An instruction smuggled into content the model treats as data (a retrieved document, a user message) that the model can't distinguish from a real system instruction.", moduleId: "65-security" },
  { term: "Guardrail", definition: "A pre- or post-model check (content filter, PII redaction, jailbreak detector) that runs input or output through a safety/policy gate before it's trusted.", moduleId: "65-security" },
  { term: "Excessive agency", definition: "An agent holding more tool access or permission than its actual task needs — turning any single mistake or injected instruction into a much larger blast radius.", moduleId: "65-security" },
  { term: "FinOps", definition: "Financial operations for cloud/AI spend: turning a monthly bill into per-query, per-tenant unit economics you can actually act on.", moduleId: "75-finops" },
  { term: "Prompt caching", definition: "A provider-side discount (often ~90%) for repeated prefixes of a prompt (system prompt, retrieved context) — only the new part of the request is billed at full price.", moduleId: "75-finops" },
  { term: "Model routing", definition: "Sending most queries to a fast, cheap model by default, and escalating to a slower, more capable model only when the task actually needs it.", moduleId: "75-finops" },
  { term: "Agent", definition: "A loop that plans, acts (calls a tool), and observes the result, repeating until a multi-step task is done — as opposed to a single retrieval-and-answer pass.", moduleId: "85-agents" },
  { term: "Agent loop (plan-act-observe)", definition: "The core agent mechanism: decide the next action, execute a tool call, look at the result, decide again — bounded by an iteration budget so it can't run forever.", moduleId: "85-agents" },
  { term: "MCP (Model Context Protocol)", definition: "A standard interface for exposing tools/data sources to any MCP-aware agent, so each tool is integrated once instead of once per agent framework.", moduleId: "85-agents" },
  { term: "Tool call / function calling", definition: "The mechanism underneath every agent: the model emits a structured request to run a specific tool with specific arguments; your code decides whether to actually run it.", moduleId: "85-agents" },
  { term: "Scoped token / least privilege", definition: "A short-lived credential granting only the narrow permissions a task actually needs — the fix for both leaked-credential risk and an agent's own mistakes turning into bigger damage.", moduleId: "85-agents" },
];
