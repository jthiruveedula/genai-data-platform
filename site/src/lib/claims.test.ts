import { describe, expect, it } from "vitest";
import { parseClaims, claimStatus, type Claim } from "./claims";

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

  it("is verified at 89 days old (within the 90-day window)", () => {
    const now = new Date("2026-07-17T00:00:00Z");
    const verifiedOn = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const claim: Claim = { ...baseClaim, verifiedOn };
    expect(claimStatus(claim, now)).toBe("verified");
  });

  it("is stale at 91 days old (past the 90-day window)", () => {
    const now = new Date("2026-07-17T00:00:00Z");
    const verifiedOn = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const claim: Claim = { ...baseClaim, verifiedOn };
    expect(claimStatus(claim, now)).toBe("stale");
  });

  it("treats an unparseable verified_on as unverified", () => {
    const claim: Claim = { ...baseClaim, verifiedOn: "not-a-date" };
    expect(claimStatus(claim, new Date("2026-07-17"))).toBe("unverified");
  });
});
