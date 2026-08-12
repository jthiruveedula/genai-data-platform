/**
 * The anatomy of a single RAG query: where its tokens go, and where its money
 * goes — which are not the same shape, and that is the entire lesson.
 *
 * Prices come from `data/pricing.json`, which CI keeps tied to
 * `validation/sources.yaml` (every entry carries a claimId and a verified_on
 * date). The token counts are ASSUMPTIONS about one typical query, stated as
 * constants below so they can be read, argued with, and changed in one place —
 * they are not measurements, and anything rendering this must say so.
 *
 * The one thing this must never do is invent a per-token price for a
 * self-hosted deployment. OSS is metered per GPU-hour: its cost per query
 * depends on utilisation, not on tokens, so `metering` is part of the model and
 * a renderer has to handle both cases rather than printing a made-up dollar
 * figure for the fourth column.
 */

import pricing from "../data/pricing.json";

export type CloudId = "gcp" | "aws" | "azure" | "oss";

/**
 * One typical retrieval-augmented query. Assumptions, not measurements —
 * chosen to match the pipeline this site teaches: a short question, six
 * retrieved chunks of the size Module 15 recommends, a system prompt, and a
 * paragraph-length grounded answer.
 */
export const QUERY_SHAPE = {
  /** The user's question, embedded once for retrieval and repeated in the prompt. */
  questionTokens: 40,
  /** Retrieved chunks pasted into the prompt: k × chunk size. */
  retrievedChunks: 6,
  tokensPerChunk: 350,
  /** Instructions, citation rules, output format. */
  systemTokens: 120,
  /** A grounded paragraph with citations. */
  answerTokens: 400,
} as const;

export const CONTEXT_TOKENS =
  QUERY_SHAPE.retrievedChunks * QUERY_SHAPE.tokensPerChunk;

export type SegmentId = "embed" | "question" | "system" | "context" | "answer";

export interface CostSegment {
  id: SegmentId;
  label: string;
  /** What this segment is, in one line — shown on hover/focus. */
  note: string;
  tokens: number;
  /** Unit price applied to this segment, $ per million tokens. */
  usdPerMtok: number;
  /** tokens / 1e6 × usdPerMtok. Zero for GPU-metered deployments. */
  usd: number;
  /** Which side of the bill this lands on. */
  side: "input" | "output" | "embedding";
}

export interface QueryCost {
  cloud: CloudId;
  model: string;
  metering: "per-token" | "per-gpu-hour";
  claimId: string;
  verifiedOn: string;
  segments: CostSegment[];
  totalTokens: number;
  /** Total $ for one query. Zero when metering is per-gpu-hour. */
  totalUsd: number;
  /** The same query if it escalates to the reasoning tier. */
  escalatedUsd: number;
  reasoningMultiplier: number;
  /** $/hour of the GPU, for per-gpu-hour deployments only. */
  gpuHourUsd?: number;
}

type PricingEntry = {
  model: string;
  input_per_mtok?: number;
  output_per_mtok?: number;
  embedding_per_mtok?: number;
  gpu_hour_usd?: number;
  reasoning_multiplier?: number;
  claimId: string;
  verified_on: string;
};

const PRICING = pricing as Record<CloudId, PricingEntry>;

const round = (usd: number) => Math.round(usd * 1e6) / 1e6;

/**
 * The cost of one query on one cloud.
 *
 * For per-token clouds every segment is priced. For a self-hosted (GPU-hour)
 * deployment the token counts are identical — the same work happens — but the
 * dollar figures are zero and `metering` says why, because there is no honest
 * per-token price to show.
 */
export function queryCost(cloud: CloudId): QueryCost {
  const entry = PRICING[cloud];
  // The data says which meter applies: a GPU-hour rate means this deployment
  // is not billed per token, and its token rates are explicit zeros rather
  // than absent. Reading "missing rate" as the signal would have quietly
  // priced self-hosting at $0.00 a query, which is the exact lie this model
  // exists to avoid.
  const perToken = entry.gpu_hour_usd == null;
  const inputRate = entry.input_per_mtok ?? 0;
  const outputRate = entry.output_per_mtok ?? 0;
  const embedRate = entry.embedding_per_mtok ?? 0;

  const priced = (tokens: number, rate: number) =>
    perToken ? round((tokens / 1e6) * rate) : 0;

  const segments: CostSegment[] = [
    {
      id: "embed",
      label: "Embed the question",
      note: "The query becomes a vector before anything can be retrieved.",
      tokens: QUERY_SHAPE.questionTokens,
      usdPerMtok: perToken ? embedRate : 0,
      usd: priced(QUERY_SHAPE.questionTokens, embedRate),
      side: "embedding",
    },
    {
      id: "system",
      label: "System prompt",
      note: "Instructions, citation rules and output format — sent every time.",
      tokens: QUERY_SHAPE.systemTokens,
      usdPerMtok: perToken ? inputRate : 0,
      usd: priced(QUERY_SHAPE.systemTokens, inputRate),
      side: "input",
    },
    {
      id: "context",
      label: "Retrieved context",
      note: `${QUERY_SHAPE.retrievedChunks} chunks × ${QUERY_SHAPE.tokensPerChunk} tokens — the bulk of what you send.`,
      tokens: CONTEXT_TOKENS,
      usdPerMtok: perToken ? inputRate : 0,
      usd: priced(CONTEXT_TOKENS, inputRate),
      side: "input",
    },
    {
      id: "question",
      label: "The question itself",
      note: "The smallest part of the prompt, and the only part the user wrote.",
      tokens: QUERY_SHAPE.questionTokens,
      usdPerMtok: perToken ? inputRate : 0,
      usd: priced(QUERY_SHAPE.questionTokens, inputRate),
      side: "input",
    },
    {
      id: "answer",
      label: "Generated answer",
      note: "Few tokens, the highest unit price — which is why it dominates the bill.",
      tokens: QUERY_SHAPE.answerTokens,
      usdPerMtok: perToken ? outputRate : 0,
      usd: priced(QUERY_SHAPE.answerTokens, outputRate),
      side: "output",
    },
  ];

  const totalUsd = round(segments.reduce((sum, s) => sum + s.usd, 0));
  const multiplier = entry.reasoning_multiplier ?? 1;

  return {
    cloud,
    model: entry.model,
    metering: perToken ? "per-token" : "per-gpu-hour",
    claimId: entry.claimId,
    verifiedOn: entry.verified_on,
    segments,
    totalTokens: segments.reduce((sum, s) => sum + s.tokens, 0),
    totalUsd,
    // Escalation re-runs the generation on a reasoning-tier model; the prompt
    // is unchanged, so only the output side carries the multiplier.
    escalatedUsd: round(
      segments.reduce(
        (sum, s) => sum + (s.side === "output" ? s.usd * multiplier : s.usd),
        0,
      ),
    ),
    reasoningMultiplier: multiplier,
    gpuHourUsd: entry.gpu_hour_usd,
  };
}

/** Share of the query's money this segment accounts for, 0..1. */
export function costShare(cost: QueryCost, segment: CostSegment): number {
  return cost.totalUsd > 0 ? segment.usd / cost.totalUsd : 0;
}

/** Share of the query's tokens this segment accounts for, 0..1. */
export function tokenShare(cost: QueryCost, segment: CostSegment): number {
  return cost.totalTokens > 0 ? segment.tokens / cost.totalTokens : 0;
}

/**
 * The headline the visual is making: the answer is a small share of the tokens
 * and a large share of the money. Returned as data so the page can state it in
 * words, and so a test can fail if it ever stops being true of real prices.
 */
export function outputConcentration(cloud: CloudId) {
  const cost = queryCost(cloud);
  const answer = cost.segments.find((s) => s.id === "answer")!;
  return {
    tokenShare: tokenShare(cost, answer),
    costShare: costShare(cost, answer),
  };
}

export const ALL_CLOUDS: CloudId[] = ["gcp", "aws", "azure", "oss"];
