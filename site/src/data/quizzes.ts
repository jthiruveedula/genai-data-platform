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
};
