/**
 * Per-module visual recaps — the closing "what should stick" section that
 * replaced the checkpoint quizzes. Each module gets three takeaways plus one
 * visual: an ECharts chart where real data exists (published pricing or pure
 * arithmetic on it), or a flow/layer diagram where the module's core idea is
 * structural rather than numeric.
 *
 * Honest-copy rule: chart captions must say where numbers come from; the one
 * deliberately illustrative chart (chunking) says so in its caption.
 */

import type { RecapChartId } from "../lib/recap-chart-options";

export interface RecapNode {
  label: string;
  note?: string;
}

export type RecapVisual =
  | { kind: "chart"; chart: RecapChartId; caption: string }
  | { kind: "flow"; nodes: RecapNode[]; caption: string }
  | { kind: "layers"; layers: RecapNode[]; caption: string };

export interface RecapContent {
  title: string;
  takeaways: string[];
  visual: RecapVisual;
}

export const RECAPS: Record<string, RecapContent> = {
  "00-foundations": {
    title: "One pipeline, four flavors.",
    takeaways: [
      "A GenAI data platform is the same pipeline on every cloud — ingest, chunk, embed, retrieve, generate — only the service names change.",
      "Pick the flavor your organization already runs; the architecture transfers, and this site shows every module in all four.",
      "Cost concentrates in the generation call, so your cloud's fast-tier model price matters from day one.",
    ],
    visual: {
      kind: "chart",
      chart: "pricing-bars",
      caption:
        "Fast-tier list prices per million tokens, as verified on the freshness page. Self-hosted (OSS) is priced per GPU-hour instead — see Module 75 for that break-even.",
    },
  },
  "10-ingestion": {
    title: "Land raw, normalize once, re-run safely.",
    takeaways: [
      "Land raw source data first, exactly as received — normalization bugs are only recoverable if the original bytes still exist.",
      "Make every ingestion run idempotent, so re-running after a failure can never duplicate documents.",
      "Metadata captured at ingestion (source, tenant, timestamp, ACL) is the only metadata retrieval can filter on later.",
    ],
    visual: {
      kind: "flow",
      nodes: [
        { label: "Sources", note: "docs, tickets, wikis" },
        { label: "Batch / stream load", note: "idempotent runs" },
        { label: "Raw store", note: "bytes as received" },
        { label: "Normalize + dedupe", note: "one clean shape" },
        { label: "Chunk-ready corpus", note: "metadata attached" },
      ],
      caption: "The ingestion path every flavor implements — only the storage and mover services differ per cloud.",
    },
  },
  "15-chunking": {
    title: "Chunk size is a dial, not a default.",
    takeaways: [
      "Chunk size trades retrieval precision against context cost — tiny chunks lose meaning, huge chunks blur topics together and cost more per generation call.",
      "Structure-aware splitting (headings, paragraphs, code blocks) beats fixed-size splitting on real documents.",
      "Store chunk metadata (parent document, position, heading path) so retrieval can reassemble context around a hit.",
    ],
    visual: {
      kind: "chart",
      chart: "chunking-tradeoff",
      caption:
        "Illustrative shapes, not measured data — real precision curves depend entirely on your corpus, which is why Module 45 makes you measure your own.",
    },
  },
  "20-embeddings": {
    title: "Dimensions are a storage budget.",
    takeaways: [
      "Embedding dimension sets your storage and latency budget: raw float32 vectors cost dimensions × 4 bytes each, before any index overhead.",
      "Higher dimensions are not automatically better retrieval — measure on your corpus before paying for them.",
      "Re-embedding a corpus is a migration: version your embeddings so old and new vectors never mix silently in one index.",
    ],
    visual: {
      kind: "chart",
      chart: "embedding-storage",
      caption: "Pure arithmetic: dimensions × 4 bytes × 1M vectors, before index structures. Doubling dimensions doubles the bill for every vector you store.",
    },
  },
  "25-serving": {
    title: "Fast first, escalate on doubt.",
    takeaways: [
      "Route every query to the fast, cheap tier by default; escalate to a reasoning-tier model only when confidence is low.",
      "Stream tokens to the user — perceived latency is set by time-to-first-token, not total generation time.",
      "Serving is where cost policy lives: routing, caching, and truncation decisions all happen here, not in the model.",
    ],
    visual: {
      kind: "flow",
      nodes: [
        { label: "Query" },
        { label: "Fast tier", note: "default path" },
        { label: "Confidence check", note: "retrieval + model signals" },
        { label: "Reasoning tier", note: "escalation only" },
        { label: "Streamed answer" },
      ],
      caption: "The fast-first routing spine — Module 75 measures exactly how much this saves.",
    },
  },
  "35-retrieval": {
    title: "Hybrid catches what either half misses.",
    takeaways: [
      "Dense retrieval finds meaning, sparse retrieval finds exact terms — hybrid search runs both and fuses the results.",
      "Rank fusion (RRF) is nearly free; a reranker is the precision upgrade you add when top-k quality still isn't enough.",
      "Recall is corpus-specific: measure it on your own documents, not on a benchmark's.",
    ],
    visual: {
      kind: "flow",
      nodes: [
        { label: "Query" },
        { label: "Dense + sparse", note: "run in parallel" },
        { label: "Fusion", note: "RRF" },
        { label: "Rerank", note: "optional precision pass" },
        { label: "Top-k context" },
      ],
      caption: "The hybrid retrieval path — every flavor implements it with its own search service.",
    },
  },
  "45-evaluation": {
    title: "Eval is a regression suite for answers.",
    takeaways: [
      "A golden set of question–answer pairs turns 'the answers feel worse' into a number you can gate deploys on.",
      "Score retrieval (did the right chunks come back?) separately from generation (was the answer faithful to them?).",
      "Every production failure is a free eval case — the golden set should grow from real misses, not synthetic ones.",
    ],
    visual: {
      kind: "flow",
      nodes: [
        { label: "Golden set", note: "Q&A pairs" },
        { label: "Run pipeline" },
        { label: "Score", note: "recall + faithfulness" },
        { label: "Gate deploy", note: "block on regression" },
        { label: "Grow the set", note: "from real failures" },
      ],
      caption: "The eval loop — failures feed back into the golden set, so the suite gets harder over time.",
    },
  },
  "55-observability": {
    title: "One trace ID, end to end.",
    takeaways: [
      "Propagate a single trace ID from request to retrieval to generation — debugging a bad answer means replaying its exact path.",
      "Record token counts on every span: Module 75's entire cost model is a join against this event log.",
      "Log structured events, not just metrics — aggregates tell you something broke, events tell you which request and why.",
    ],
    visual: {
      kind: "flow",
      nodes: [
        { label: "Request", note: "trace ID minted" },
        { label: "Retrieve span", note: "chunks + latency" },
        { label: "Generate span", note: "token counts" },
        { label: "Event log", note: "one row per request" },
        { label: "Dashboards + alerts" },
      ],
      caption: "The trace anatomy every flavor builds — the event log it produces powers both debugging and FinOps.",
    },
  },
  "65-security": {
    title: "Defense is layered, not bolted on.",
    takeaways: [
      "No single guardrail is sufficient — input filtering, retrieval ACLs, output checks, and redaction each catch what the others miss.",
      "Enforce document-level ACLs at retrieval time: a user must never retrieve a chunk they couldn't open as a document.",
      "Log every guardrail decision — an audit trail of what was blocked and why is itself a compliance requirement.",
    ],
    visual: {
      kind: "layers",
      layers: [
        { label: "Input filtering", note: "prompt-injection screening" },
        { label: "Retrieval ACLs", note: "document-level permissions" },
        { label: "Output guardrails", note: "policy + safety checks" },
        { label: "PII redaction", note: "before logging or display" },
        { label: "Audit log", note: "every decision recorded" },
      ],
      caption: "Each layer assumes the ones above it will occasionally fail — that assumption is the design.",
    },
  },
  "75-finops": {
    title: "Measure $/query, then attack the biggest line.",
    takeaways: [
      "Join the event log against your billing export to get $/query and $/tenant — unit economics, not just a monthly total.",
      "Prompt caching bills the repeated prefix at ~10% of list price; put stable content first in the prompt or the discount never fires.",
      "Self-hosting beats per-token pricing only at steady, high volume — and the engineering overhead often dwarfs the GPU bill below it.",
    ],
    visual: {
      kind: "chart",
      chart: "finops-breakeven",
      caption:
        "Both lines from the verified prices on the freshness page: the cheapest fast-tier API's output rate versus one NVIDIA L4 running 24/7. Real deployments break even later — this ignores engineering and on-call time.",
    },
  },
  "85-agents": {
    title: "An agent is a loop around your platform.",
    takeaways: [
      "Agents are plan → act → observe loops that call the same retrieval and generation services every other module built.",
      "Tools are the contract: an agent is only as safe and capable as the tool interfaces you expose to it.",
      "Bound every loop with budgets and timeouts — a runaway agent is a cost and safety incident at the same time.",
    ],
    visual: {
      kind: "flow",
      nodes: [
        { label: "Goal" },
        { label: "Plan", note: "model decides next step" },
        { label: "Tool call", note: "retrieval, APIs, code" },
        { label: "Observe", note: "result feeds the loop" },
        { label: "Answer", note: "budget + timeout bound" },
      ],
      caption: "The agent loop — steps two through four repeat until the goal is met or the budget runs out.",
    },
  },
};
