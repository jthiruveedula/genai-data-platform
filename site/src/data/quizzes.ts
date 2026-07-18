export interface QuizQuestion {
  question: string;
  options: string[];
  /** Index into `options` of the correct choice. */
  correctIndex: number;
  /** Shown only when the learner answers incorrectly. */
  explanation: string;
}

/**
 * Checkpoint quizzes (redesign spec / PLAN.md §3.2.4): 5 questions per
 * module, scored client-side, no server round-trip. Keyed by module id so
 * ModuleQuiz.astro can look one up with a single import.
 */
export const QUIZZES: Record<string, QuizQuestion[]> = {
  "00-foundations": [
    {
      question: "What's a rough token-to-character ratio for English text?",
      options: ["1 token ≈ 1 character", "1 token ≈ 4 characters", "1 token ≈ 10 characters", "1 token ≈ 1 word"],
      correctIndex: 1,
      explanation: "The rough rule of thumb is 1 token ≈ 4 characters ≈ ¾ of a word — useful for estimating cost and context budget.",
    },
    {
      question: "What does an embedding model do?",
      options: [
        "Compresses text losslessly",
        "Maps text to a vector where semantically similar text lands close together",
        "Translates text between languages",
        "Counts tokens in a document",
      ],
      correctIndex: 1,
      explanation: "An embedding model maps a chunk of text to a fixed-length vector such that similar meaning lands close together in that vector space.",
    },
    {
      question: "What is the context window?",
      options: [
        "The maximum tokens (input + output) a single model call can hold",
        "The total number of documents indexed",
        "The time limit for an API request",
        "The number of chunks retrieved per query",
      ],
      correctIndex: 0,
      explanation: "The context window bounds everything a model call can see at once — prompt, retrieved chunks, and history all have to fit inside it.",
    },
    {
      question: "Why is this curriculum \"RAG-first\"?",
      options: [
        "RAG is the cheapest way to keep answers fresh — swap the index, not the model",
        "RAG requires no infrastructure",
        "RAG eliminates the need for embeddings",
        "RAG is the only approach that works with fast models",
      ],
      correctIndex: 0,
      explanation: "RAG lets you update what the model \"knows\" by re-indexing documents, without retraining or fine-tuning a model.",
    },
    {
      question: "Does a bigger context window remove the need for good retrieval?",
      options: [
        "Yes, it fully replaces retrieval",
        "No — it just raises the cost of bad retrieval",
        "Yes, once windows exceed 1M tokens",
        "No — retrieval is only needed for small models",
      ],
      correctIndex: 1,
      explanation: "A bigger window means a bad retrieval pass stuffs more irrelevant text into a more expensive call — it doesn't fix the underlying relevance problem.",
    },
  ],
  "10-ingestion": [
    {
      question: "Why land raw files in object storage before parsing/chunking?",
      options: [
        "So every downstream stage is replayable from source",
        "Because vector databases require it",
        "Because it's required for GDPR compliance",
        "To reduce embedding costs",
      ],
      correctIndex: 0,
      explanation: "Parsing and chunking strategies change over time — keeping the raw file means every downstream stage can be re-run from source instead of being a one-way trip.",
    },
    {
      question: "What's the minimal idempotency pattern for ingestion jobs?",
      options: [
        "Hash the raw file (or use a stable source ID) as part of the storage key, so a duplicate write short-circuits",
        "Always overwrite the previous ingestion run",
        "Only ingest documents once a month",
        "Disable retries entirely",
      ],
      correctIndex: 0,
      explanation: "A stable key derived from the file's hash or source ID lets a re-run detect \"already ingested\" instead of silently duplicating the document.",
    },
    {
      question: "What metadata should be captured at ingestion time?",
      options: [
        "Source, filename, ingested-at, checksum",
        "Only the file size",
        "The embedding model name",
        "The LLM's response time",
      ],
      correctIndex: 0,
      explanation: "That metadata is what later stages need for dedup, access control, and debugging retrieval failures.",
    },
    {
      question: "What's the risk of ingesting straight into a vector index with no raw-file copy?",
      options: [
        "You lose the ability to re-chunk or re-embed later",
        "It's cheaper long-term",
        "It improves retrieval accuracy",
        "It requires no metadata",
      ],
      correctIndex: 0,
      explanation: "Without the original file, a one-way trip into an index means you can't reconstruct or re-process the source document.",
    },
    {
      question: "What happens if there's no idempotency check during development?",
      options: [
        "Nothing, re-runs are always safe",
        "A job re-run can silently multiply your document count",
        "The vector index becomes read-only",
        "Chunking quality improves",
      ],
      correctIndex: 1,
      explanation: "Re-running an ingestion job during development is common — without a duplicate check, it silently doubles (or worse) your document count.",
    },
  ],
  "15-chunking": [
    {
      question: "Which chunking approach tries a sequence of separators (paragraph, then sentence, then word) to prefer natural breaks?",
      options: ["Fixed-size", "Recursive", "Semantic", "Layout-aware"],
      correctIndex: 1,
      explanation: "Recursive chunking is the practical default: it prefers natural breaks while still respecting a size limit.",
    },
    {
      question: "What problem does chunk overlap address?",
      options: [
        "Reduces storage cost",
        "Reduces the chance a key sentence is split exactly at a chunk boundary",
        "Speeds up embedding",
        "Removes duplicate chunks",
      ],
      correctIndex: 1,
      explanation: "Overlap repeats the tail of one chunk at the start of the next, at the cost of some redundancy, so a key sentence is less likely to get orphaned by a boundary.",
    },
    {
      question: "What happens when a chunk is too large?",
      options: [
        "Irrelevant text dilutes the embedding and wastes context-window budget",
        "Retrieval becomes faster",
        "The chunk can't be embedded at all",
        "Metadata is lost",
      ],
      correctIndex: 0,
      explanation: "A chunk that's too large mixes relevant and irrelevant content, making the embedding less precise and using up context-window budget at query time.",
    },
    {
      question: "Which chunking strategy is needed for PDFs with tables or columns?",
      options: ["Fixed-size", "Semantic", "Layout-aware", "Recursive"],
      correctIndex: 2,
      explanation: "Layout-aware chunking uses the document's visual structure so a table row doesn't get split from its header.",
    },
    {
      question: "What's a pitfall of chunking before parsing/OCR is complete?",
      options: [
        "It's faster overall",
        "You'll split mid-table or mid-caption and lose the layout signal that would have prevented it",
        "It improves recall",
        "Chunks become too small",
      ],
      correctIndex: 1,
      explanation: "Chunking needs the layout signal from parsing/OCR to avoid cutting through tables or figure captions.",
    },
  ],
  "20-embeddings": [
    {
      question: "Why must queries and chunks be embedded with the same model?",
      options: [
        "Mixing models breaks the geometry the whole index depends on",
        "It's required by law",
        "Different models cost more",
        "It slows down retrieval",
      ],
      correctIndex: 0,
      explanation: "Similarity search only works if queries and chunks live in the same vector space — a different model produces an incompatible geometry.",
    },
    {
      question: "Besides the vector itself, what should a vector index entry store?",
      options: [
        "Nothing else is needed",
        "Source document, chunk text, position, and access-control metadata",
        "Only a timestamp",
        "The embedding model's training date",
      ],
      correctIndex: 1,
      explanation: "Without that metadata, an index can find a match but can't explain what it found or whether the requesting user is allowed to see it.",
    },
    {
      question: "What happens if you embed queries with a different model than the one used for chunks?",
      options: [
        "Similarity breaks silently, not loudly",
        "The system throws a clear error",
        "Costs go down",
        "Nothing changes",
      ],
      correctIndex: 0,
      explanation: "There's no error — retrieval just quietly returns worse results because the query and chunk vectors no longer share the same geometry.",
    },
    {
      question: "What should you plan for from day one regarding re-embedding?",
      options: [
        "Manually re-embedding the entire index after every chunking change",
        "Incremental re-embedding via orchestration",
        "Never re-embedding",
        "Deleting old vectors immediately",
      ],
      correctIndex: 1,
      explanation: "Chunking strategies change over time — planning for incremental re-embedding avoids a manual, error-prone full rebuild every time.",
    },
    {
      question: "What single operation is the vector index built for?",
      options: [
        "Find the K vectors closest to a given vector",
        "Store raw documents",
        "Run SQL joins",
        "Compress embeddings",
      ],
      correctIndex: 0,
      explanation: "That single nearest-neighbor operation is what makes semantic retrieval possible at all.",
    },
  ],
  "25-serving": [
    {
      question: "What are the four steps of the request path, in order?",
      options: [
        "Retrieve, embed, call LLM, construct prompt",
        "Embed, retrieve, construct prompt, call LLM",
        "Call LLM, embed, retrieve, cite",
        "Chunk, embed, retrieve, ingest",
      ],
      correctIndex: 1,
      explanation: "The question is embedded first, then used to retrieve chunks, which are assembled into a prompt, which is finally sent to the LLM.",
    },
    {
      question: "Why return a citation with every answer?",
      options: [
        "It's required by all cloud providers",
        "It costs nothing extra and makes the answer verifiable",
        "It slows down the response unnecessarily",
        "It replaces the need for guardrails",
      ],
      correctIndex: 1,
      explanation: "Retrieval already has the chunk metadata — surfacing it as a citation is free and turns \"an AI said so\" into a verifiable claim.",
    },
    {
      question: "What should happen when retrieval finds nothing relevant?",
      options: [
        "The model should answer from general knowledge",
        "The model should say it doesn't know, or return a not-found response",
        "The request should be retried indefinitely",
        "The system should crash",
      ],
      correctIndex: 1,
      explanation: "Answering from general knowledge when retrieval came up empty is exactly how ungrounded hallucination gets blamed on \"the AI.\"",
    },
    {
      question: "What's a simple guard for low-relevance retrieval?",
      options: [
        "Always call the reasoning model instead",
        "Skip the LLM call if the top similarity score is below a threshold",
        "Increase the number of retrieved chunks",
        "Disable citations",
      ],
      correctIndex: 1,
      explanation: "A similarity-score threshold is a cheap way to detect \"nothing relevant was found\" before ever calling the LLM.",
    },
    {
      question: "What's the risk of defaulting to the most expensive model for every query?",
      options: [
        "Better accuracy with no downside",
        "Unnecessary cost and latency — start fast-tier, escalate only when needed",
        "It's required for citations to work",
        "It removes the need for retrieval",
      ],
      correctIndex: 1,
      explanation: "Most queries don't need a reasoning-tier model — escalating only when the task calls for it keeps cost and latency down.",
    },
  ],
  "35-retrieval": [
    {
      question: "Why does vector search alone sometimes miss the right chunk?",
      options: [
        "Vector databases are inherently unreliable",
        "Embeddings encode meaning, not exact tokens like SKUs or error codes",
        "Vector search is too slow",
        "Chunks are too large",
      ],
      correctIndex: 1,
      explanation: "A product SKU or error code is an exact-match problem — embeddings capture meaning, not exact tokens, which is what hybrid search fixes.",
    },
    {
      question: "What does hybrid search combine?",
      options: [
        "Two different embedding models",
        "A keyword method (BM25) and vector search",
        "Two vector databases",
        "Chunking and OCR",
      ],
      correctIndex: 1,
      explanation: "Hybrid search runs BM25 (keyword) and vector search together, then combines both rankings.",
    },
    {
      question: "What's the typical pattern for using a reranker?",
      options: [
        "Rerank the entire index for every query",
        "Cheap retrieval for recall, reranking a small candidate set for precision",
        "Skip retrieval entirely and rerank raw documents",
        "Use it only for chunking",
      ],
      correctIndex: 1,
      explanation: "Rerankers are accurate but slow per item — they're applied to a small top-K candidate set, not the whole index.",
    },
    {
      question: "What does HyDE (Hypothetical Document Embeddings) do?",
      options: [
        "Hides documents from unauthorized users",
        "Asks the LLM to draft a hypothetical answer, then embeds that instead of the raw question",
        "Hyper-compresses embeddings",
        "Deletes irrelevant chunks",
      ],
      correctIndex: 1,
      explanation: "A hypothetical answer's phrasing tends to resemble real answers more than a raw question does, which can improve retrieval.",
    },
    {
      question: "How do you measure whether a retrieval change actually helped?",
      options: [
        "Eyeball a few queries",
        "Use a labeled set and measure recall@k / precision@k",
        "Count the number of chunks returned",
        "Measure the embedding model's file size",
      ],
      correctIndex: 1,
      explanation: "Without a labeled set and recall/precision metrics, you're optimizing retrieval changes by feel rather than by evidence.",
    },
  ],
  "45-evaluation": [
    {
      question: "What does a golden dataset consist of?",
      options: [
        "A set of production logs with no labels",
        "20+ labeled Q&A pairs with expected answers or reference chunks",
        "The full text of every ingested document",
        "A list of every embedding model available",
      ],
      correctIndex: 1,
      explanation: "A golden dataset is a labeled set of representative questions with known-good answers or reference context — the baseline every eval metric is measured against.",
    },
    {
      question: "What does the faithfulness metric measure?",
      options: [
        "Whether the response is grammatically correct",
        "Whether every claim in the response is supported by the retrieved context",
        "How fast the model responded",
        "How many chunks were retrieved",
      ],
      correctIndex: 1,
      explanation: "Faithfulness checks the response against its retrieved context — a response can be fluent and still unfaithful if it states things the context doesn't support.",
    },
    {
      question: "Why calibrate an LLM-as-judge against human labels?",
      options: [
        "It's required by every cloud provider",
        "Judge models have their own biases and blind spots, so human agreement tells you how much to trust the score",
        "It makes the judge model cheaper to run",
        "It removes the need for a golden dataset",
      ],
      correctIndex: 1,
      explanation: "An LLM-as-judge is a model scoring another model — without checking it against human judgment on a sample, you don't know if its scores are trustworthy.",
    },
    {
      question: "What's the point of gating a deploy on regression evals in CI?",
      options: [
        "To slow down releases for no reason",
        "To catch a prompt or retrieval change that silently degrades quality before it reaches users",
        "To replace human QA entirely",
        "To reduce the size of the golden dataset over time",
      ],
      correctIndex: 1,
      explanation: "A regression eval re-runs the golden dataset on every change and fails the build if metrics like faithfulness drop — the same discipline as a test suite, applied to model quality.",
    },
    {
      question: "Which pair of metrics evaluates the retrieval half of a RAG pipeline rather than the generation half?",
      options: [
        "Faithfulness and helpfulness",
        "Context precision and context recall",
        "Latency and cost",
        "Token count and chunk size",
      ],
      correctIndex: 1,
      explanation: "Context precision/recall score whether retrieval surfaced the right (and only the right) chunks — a prerequisite for the generation step to be graded fairly.",
    },
  ],
  "55-observability": [
    {
      question: "Why trace query, retrieval, prompt, and completion as one connected trace instead of separate logs?",
      options: [
        "It's cheaper to store",
        "It lets you see which stage caused a slow or wrong response for a single request",
        "It removes the need for token accounting",
        "It's required for billing",
      ],
      correctIndex: 1,
      explanation: "A single trace with nested spans lets you pinpoint whether a bad response came from retrieval, prompt construction, or generation — separate logs make that correlation manual and slow.",
    },
    {
      question: "What should be recorded as span attributes on the generation step?",
      options: [
        "Only the final answer text",
        "Input, output, and cached token counts",
        "The chunking strategy used in Module 15",
        "The vector index's total size",
      ],
      correctIndex: 1,
      explanation: "Token counts per request are what later feeds cost analysis (Module 75) and capacity planning — without them on the span, that data is lost after the request completes.",
    },
    {
      question: "What's the difference between time-to-first-token (TTFT) and total latency?",
      options: [
        "They're the same thing",
        "TTFT measures how quickly a response starts streaming; total latency measures the full response time",
        "TTFT only applies to embeddings",
        "Total latency ignores retrieval time",
      ],
      correctIndex: 1,
      explanation: "TTFT is what makes a streaming response feel responsive even if total latency is high — the two numbers answer different UX questions.",
    },
    {
      question: "Why is the GenAI event log described as the platform's analytical backbone?",
      options: [
        "It's the only place documents are stored",
        "Every downstream module — evaluation, security, cost — reads from the same traced request/response log",
        "It replaces the vector index",
        "It's only used for debugging outages",
      ],
      correctIndex: 1,
      explanation: "Modules 45, 65, and 75 all reuse the same event log for eval regression sets, security audits, and cost joins — instrumenting it once here pays off across the rest of the curriculum.",
    },
    {
      question: "What's a pitfall of only logging the final response and not intermediate spans?",
      options: [
        "It saves storage with no real downside",
        "You can't tell whether a bad answer came from retrieval or generation",
        "It's required for GDPR compliance",
        "It improves token accounting",
      ],
      correctIndex: 1,
      explanation: "Without intermediate spans, a wrong answer is a black box — you can't tell if retrieval missed the right chunk or generation ignored good context.",
    },
  ],
  "65-security": [
    {
      question: "What is indirect prompt injection?",
      options: [
        "A user directly typing malicious instructions into the chat box",
        "A malicious instruction hidden inside a retrieved document that the model treats as trusted input",
        "A denial-of-service attack on the vector index",
        "A misconfigured API key",
      ],
      correctIndex: 1,
      explanation: "Indirect injection is scarier than direct injection because a single poisoned document in the index can attack every future query that happens to retrieve it, not just one attacker's own session.",
    },
    {
      question: "What causes cross-tenant data exfiltration via retrieval?",
      options: [
        "Using too large a chunk size",
        "Missing document-level access-control filters on retrieval, letting one tenant's query surface another tenant's chunks",
        "Using an outdated embedding model",
        "Not using a reranker",
      ],
      correctIndex: 1,
      explanation: "If retrieval doesn't filter by the requesting user's permissions, the index will happily return the most semantically similar chunk regardless of who it belongs to.",
    },
    {
      question: "How does a jailbreak differ from a prompt injection?",
      options: [
        "They're the same attack under different names",
        "A jailbreak tries to bypass the model's own safety training; injection hijacks the model using untrusted content in its context",
        "Jailbreaks only work on open-weight models",
        "Injection only affects embeddings, not generation",
      ],
      correctIndex: 1,
      explanation: "A jailbreak targets the model's alignment directly (usually via the user's own prompt); injection instead smuggles instructions in through data the model was never meant to treat as commands.",
    },
    {
      question: "Why should LLM output be treated as untrusted input?",
      options: [
        "Because models are always factually wrong",
        "Because rendering raw model output as HTML can lead to XSS if the model was manipulated into emitting a script tag",
        "Because it slows down the response",
        "Because it increases token cost",
      ],
      correctIndex: 1,
      explanation: "A model whose context includes attacker-controlled text can be steered into emitting markup — if that output is rendered as HTML without sanitization, it's a straightforward XSS vector.",
    },
    {
      question: "What does the OWASP LLM Top 10 provide?",
      options: [
        "A pricing benchmark for LLM APIs",
        "A structured list of the most common LLM application security risks, including prompt injection and insecure output handling",
        "A ranking of the fastest models",
        "A list of the ten best vector databases",
      ],
      correctIndex: 1,
      explanation: "The OWASP LLM Top 10 gives the risks covered in this module (injection, data leakage, insecure output handling) a shared vocabulary and a checklist to audit against.",
    },
  ],
  "75-finops": [
    {
      question: "What are $/query and $/tenant computed from?",
      options: [
        "A flat estimate with no real data",
        "The traced event log from Module 55 joined against billing data",
        "The vector index's storage size",
        "The chunking strategy chosen in Module 15",
      ],
      correctIndex: 1,
      explanation: "Unit economics require joining per-request billing cost against the request-level event log — without Module 55's traces, cost can only be measured in aggregate, not per query or tenant.",
    },
    {
      question: "In a typical RAG pipeline, where does most of the LLM spend usually go?",
      options: [
        "Embedding calls",
        "LLM output tokens from generation",
        "Vector index storage",
        "Chunking compute",
      ],
      correctIndex: 1,
      explanation: "Embeddings are cheap and computed once per chunk; output tokens are generated per request and priced higher than input tokens, so generation usually dominates the bill.",
    },
    {
      question: "What problem does semantic caching solve?",
      options: [
        "It reduces chunk size",
        "It avoids paying for a full LLM call when a semantically similar question was already answered",
        "It replaces the need for a vector index",
        "It speeds up ingestion",
      ],
      correctIndex: 1,
      explanation: "Semantic caching matches a new query against previously answered (not just identical) queries, so repeated or rephrased questions can skip the expensive generation call.",
    },
    {
      question: "What is model routing in a FinOps context?",
      options: [
        "Always using the most powerful model available",
        "Trying a fast, cheap model first and escalating to a reasoning-tier model only on low confidence",
        "Splitting traffic randomly across models",
        "Routing all requests through a single region",
      ],
      correctIndex: 1,
      explanation: "Most queries don't need a reasoning-tier model — routing the fast tier first and escalating only when needed keeps average cost down without sacrificing quality on hard queries.",
    },
    {
      question: "Why is capacity planning still necessary even with pay-as-you-go pricing?",
      options: [
        "Pay-as-you-go has no cost implications",
        "Sustained high volume can make a reserved/provisioned commitment cheaper than per-call pricing",
        "It's only relevant for on-premise deployments",
        "It replaces the need for caching",
      ],
      correctIndex: 1,
      explanation: "Provisioned throughput or reserved capacity trades a fixed commitment for a lower marginal rate — worth it only once volume is predictable and high enough, which is what capacity planning figures out.",
    },
  ],
  "85-agents": [
    {
      question: "What happens in a function-calling turn?",
      options: [
        "The model directly executes code on the server",
        "The model emits a structured tool call, the runtime executes it, and the result is fed back into context",
        "The model retrieves chunks from a vector index automatically",
        "The model bypasses the context window",
      ],
      correctIndex: 1,
      explanation: "The model never executes anything itself — it emits a structured request, your runtime decides whether and how to run it, and the result becomes new context for the next turn.",
    },
    {
      question: "What is the plan-act-observe loop bounded by?",
      options: [
        "Nothing — it should run until the task is fully solved",
        "A fixed iteration or token budget, so an unsolvable task fails safely instead of looping forever",
        "The size of the vector index",
        "The number of available tools",
      ],
      correctIndex: 1,
      explanation: "Without a budget, an agent that can't make progress on a task will keep planning and acting indefinitely, burning cost with no result — the budget forces a safe stop.",
    },
    {
      question: "What does MCP (Model Context Protocol) standardize?",
      options: [
        "The pricing of LLM API calls",
        "A common interface between agents and the tools/data sources they call",
        "The format of vector embeddings",
        "The chunking strategy for documents",
      ],
      correctIndex: 1,
      explanation: "MCP gives tool and data providers one interface to implement instead of a bespoke integration per agent framework, the same way a driver standardizes access to different databases.",
    },
    {
      question: "When does single-hop RAG beat an agent loop?",
      options: [
        "Always — agents are strictly better",
        "When the task is a single lookup answerable from one retrieval pass, where an agent loop just adds latency and cost",
        "Never — agents subsume RAG entirely",
        "Only when no tools are available",
      ],
      correctIndex: 1,
      explanation: "A direct question answerable from one retrieval pass doesn't need multi-step planning — an agent loop adds overhead without adding value for that case; agents earn their cost on genuinely multi-step tasks.",
    },
    {
      question: "What's the least-privilege principle for agent tool access?",
      options: [
        "Give every agent access to every tool for flexibility",
        "Grant only the specific tools/scopes an agent's task needs, and gate side-effecting calls behind human approval",
        "Only apply it to read-only tools",
        "It only matters for multi-agent systems",
      ],
      correctIndex: 1,
      explanation: "An agent with more tool access than its task requires becomes a bigger blast radius if it's manipulated via injected instructions or simply plans poorly — scope tools tightly and gate anything with a side effect.",
    },
  ],
};
