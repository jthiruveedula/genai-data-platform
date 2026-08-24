import { describe, expect, it } from "vitest";
import { parseClaims, claimStatus, moduleHref, type Claim } from "./claims";

const SAMPLE_YAML = `
# Claim registry sample fixture (mirrors validation/sources.yaml's shape).

claims:
  - id: sample-with-sources
    used_by: site/src/data/flavors/gcp.ts#00-foundations
    claim: "Sample claim with sources and a verified date"
    sources:
      - https://example.com/a
      - https://example.com/b
    volatility: medium
    verified_on: "2026-01-01"

  - id: sample-empty
    used_by: site/src/data/flavors/aws.ts#10-ingestion
    claim: "Sample claim with no sources yet"
    sources: []
    volatility: low
    verified_on: null

  - id: sample-with-schema
    used_by: site/src/data/pricing.json#gcp
    claim: "Sample pricing claim"
    sources: []
    volatility: high
    verified_on: null
    extract_schema: { input_per_mtok: number, output_per_mtok: number, model: string }
`;

describe("parseClaims", () => {
  const claims = parseClaims(SAMPLE_YAML);

  it("parses every entry", () => {
    expect(claims).toHaveLength(3);
    expect(claims.map((c) => c.id)).toEqual(["sample-with-sources", "sample-empty", "sample-with-schema"]);
  });

  it("parses a block-list of sources", () => {
    const claim = claims[0];
    expect(claim.sources).toEqual(["https://example.com/a", "https://example.com/b"]);
  });

  it("strips quotes from the claim sentence and verified_on date", () => {
    const claim = claims[0];
    expect(claim.claim).toBe("Sample claim with sources and a verified date");
    expect(claim.verifiedOn).toBe("2026-01-01");
  });

  it("parses used_by and volatility", () => {
    const claim = claims[0];
    expect(claim.usedBy).toBe("site/src/data/flavors/gcp.ts#00-foundations");
    expect(claim.volatility).toBe("medium");
  });

  it("parses an empty inline sources list and a null verified_on", () => {
    const claim = claims[1];
    expect(claim.sources).toEqual([]);
    expect(claim.verifiedOn).toBeNull();
  });

  it("ignores unmodeled keys like extract_schema without breaking later parsing", () => {
    const claim = claims[2];
    expect(claim.id).toBe("sample-with-schema");
    expect(claim.claim).toBe("Sample pricing claim");
    expect(claim.sources).toEqual([]);
    expect(claim.verifiedOn).toBeNull();
  });
});

describe("claimStatus", () => {
  const baseClaim: Claim = {
    id: "x",
    usedBy: "site/src/data/flavors/gcp.ts#00-foundations",
    claim: "x",
    sources: [],
    volatility: "low",
    verifiedOn: null,
  };

  it("is unverified when verified_on is null", () => {
    expect(claimStatus(baseClaim, new Date("2026-07-17"))).toBe("unverified");
  });

  // The window is per-volatility (see STALE_AFTER_DAYS): high claims —
  // pricing, model catalogs — are re-checked bi-weekly, so they go amber at
  // 14 days while a low-volatility claim of the same age is still fine.
  const now = new Date("2026-07-17T00:00:00Z");
  const agedBy = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  it("holds a medium claim verified at 89 days and stales it at 91", () => {
    const claim: Claim = { ...baseClaim, volatility: "medium" };
    expect(claimStatus({ ...claim, verifiedOn: agedBy(89) }, now)).toBe("verified");
    expect(claimStatus({ ...claim, verifiedOn: agedBy(91) }, now)).toBe("stale");
  });

  it("stales a high-volatility claim at 15 days, not 91", () => {
    const claim: Claim = { ...baseClaim, volatility: "high" };
    expect(claimStatus({ ...claim, verifiedOn: agedBy(13) }, now)).toBe("verified");
    expect(claimStatus({ ...claim, verifiedOn: agedBy(15) }, now)).toBe("stale");
  });

  it("still counts a low-volatility claim verified at 91 days as fresh", () => {
    const claim: Claim = { ...baseClaim, volatility: "low", verifiedOn: agedBy(91) };
    expect(claimStatus(claim, now)).toBe("verified");
    expect(claimStatus({ ...claim, verifiedOn: agedBy(181) }, now)).toBe("stale");
  });

  it("treats an unparseable verified_on as unverified", () => {
    const claim: Claim = { ...baseClaim, verifiedOn: "not-a-date" };
    expect(claimStatus(claim, new Date("2026-07-17"))).toBe("unverified");
  });
});

// Regression test for a real bug caught by a lychee link-check pass: this
// used to naively link every claim to `${base}modules/<whatever follows #>/`,
// which is correct for flavors/*.ts claims but produced dead links like
// /modules/aws/ for pricing.json claims (whose suffix is a cloud id, not a
// module id).
describe("moduleHref", () => {
  const base = "/genai-data-platform/";

  it("links a flavors/*.ts claim to its module page", () => {
    expect(moduleHref("site/src/data/flavors/aws.ts#45-evaluation", base)).toBe(
      "/genai-data-platform/modules/45-evaluation/",
    );
  });

  it("links a pricing.json claim to the calculator, not a fake module page", () => {
    expect(moduleHref("site/src/data/pricing.json#aws", base)).toBe("/genai-data-platform/calculator/");
  });

  it("returns null when there's no # suffix", () => {
    expect(moduleHref("site/src/data/flavors/aws.ts", base)).toBeNull();
  });

  it("returns null for an unrecognized path shape", () => {
    expect(moduleHref("some/other/file.ts#thing", base)).toBeNull();
  });
});
