import { describe, expect, it } from "vitest";
import pricing from "../data/pricing.json";
import {
  ALL_CLOUDS,
  CONTEXT_TOKENS,
  QUERY_SHAPE,
  costShare,
  outputConcentration,
  queryCost,
  tokenShare,
} from "./queryCost";

describe("query cost model", () => {
  it("prices every token of the query, and nothing else", () => {
    for (const cloud of ALL_CLOUDS) {
      const cost = queryCost(cloud);
      const expected =
        QUERY_SHAPE.questionTokens * 2 + // embedded once, then sent in the prompt
        QUERY_SHAPE.systemTokens +
        CONTEXT_TOKENS +
        QUERY_SHAPE.answerTokens;
      expect(cost.totalTokens, `${cloud} token total`).toBe(expected);
    }
  });

  it("derives dollars from pricing.json rather than carrying its own numbers", () => {
    const cost = queryCost("gcp");
    const answer = cost.segments.find((s) => s.id === "answer")!;
    // If pricing.json is re-verified to a new rate, this must move with it.
    expect(answer.usd).toBeCloseTo(
      (QUERY_SHAPE.answerTokens / 1e6) * pricing.gcp.output_per_mtok,
      9,
    );
    expect(answer.usdPerMtok).toBe(pricing.gcp.output_per_mtok);
    expect(cost.claimId).toBe(pricing.gcp.claimId);
    expect(cost.verifiedOn).toBe(pricing.gcp.verified_on);
  });

  it("never invents a per-token price for a GPU-metered deployment", () => {
    const oss = queryCost("oss");
    expect(oss.metering).toBe("per-gpu-hour");
    expect(oss.totalUsd).toBe(0);
    expect(oss.segments.every((s) => s.usd === 0)).toBe(true);
    // The work still happens — the tokens are identical to every other cloud.
    expect(oss.totalTokens).toBe(queryCost("gcp").totalTokens);
    expect(oss.gpuHourUsd).toBe(pricing.oss.gpu_hour_usd);
  });

  it("keeps the token-metered clouds priced and attributable", () => {
    for (const cloud of ["gcp", "aws", "azure"] as const) {
      const cost = queryCost(cloud);
      expect(cost.metering, cloud).toBe("per-token");
      expect(cost.totalUsd, cloud).toBeGreaterThan(0);
      expect(cost.claimId, cloud).toBeTruthy();
      expect(cost.verifiedOn, cloud).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("shares sum to one across the segments", () => {
    for (const cloud of ["gcp", "aws", "azure"] as const) {
      const cost = queryCost(cloud);
      const cost_ = cost.segments.reduce((s, seg) => s + costShare(cost, seg), 0);
      const tok = cost.segments.reduce((s, seg) => s + tokenShare(cost, seg), 0);
      expect(cost_, `${cloud} cost shares`).toBeCloseTo(1, 6);
      expect(tok, `${cloud} token shares`).toBeCloseTo(1, 6);
    }
  });

  it("holds the claim the visual makes: few output tokens, most of the money", () => {
    // This is the argument on the page. If real prices ever stop supporting it,
    // the page is making a false claim and this should fail rather than the
    // copy quietly becoming wrong.
    for (const cloud of ["gcp", "aws", "azure"] as const) {
      const { tokenShare: t, costShare: c } = outputConcentration(cloud);
      expect(t, `${cloud} answer token share`).toBeLessThan(0.2);
      expect(c, `${cloud} answer cost share`).toBeGreaterThan(0.4);
    }
  });

  it("charges escalation to the output side only", () => {
    const cost = queryCost("aws");
    const output = cost.segments.filter((s) => s.side === "output");
    const rest = cost.totalUsd - output.reduce((s, x) => s + x.usd, 0);
    const expected =
      rest + output.reduce((s, x) => s + x.usd, 0) * cost.reasoningMultiplier;
    expect(cost.escalatedUsd).toBeCloseTo(expected, 9);
    expect(cost.escalatedUsd).toBeGreaterThan(cost.totalUsd);
  });

  it("says context is the bulk of what you send", () => {
    for (const cloud of ["gcp", "aws", "azure"] as const) {
      const cost = queryCost(cloud);
      const context = cost.segments.find((s) => s.id === "context")!;
      const inputs = cost.segments.filter((s) => s.side === "input");
      const inputTokens = inputs.reduce((s, x) => s + x.tokens, 0);
      expect(context.tokens / inputTokens, cloud).toBeGreaterThan(0.85);
    }
  });
});
