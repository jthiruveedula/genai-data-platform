// Run with: node --test validation/due-claims.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseRegistry, dueClaims, RECHECK_DAYS } from "./due-claims.mjs";

// Mirrors validation/sources.yaml's shape, one entry per volatility band.
const SAMPLE = `
claims:
  - id: fast-claim
    used_by: site/src/data/pricing.json#gcp
    claim: "A price that moves"
    sources:
      - https://example.com/pricing
    volatility: high
    verified_on: "2026-08-01"

  - id: slow-claim
    used_by: site/src/data/flavors/aws.ts#10-ingestion
    claim: "A service that doesn't"
    sources: []
    volatility: low
    verified_on: "2026-08-01"

  - id: never-checked
    used_by: site/src/data/flavors/oss.ts#00-foundations
    claim: "Not verified yet"
    sources: []
    volatility: medium
    verified_on: null
`;

const claims = parseRegistry(SAMPLE);
const now = new Date("2026-08-20T00:00:00Z"); // 19 days after verification

test("parses id, volatility and verified_on for every entry", () => {
  assert.deepEqual(claims, [
    { id: "fast-claim", volatility: "high", verifiedOn: "2026-08-01" },
    { id: "slow-claim", volatility: "low", verifiedOn: "2026-08-01" },
    { id: "never-checked", volatility: "medium", verifiedOn: null },
  ]);
});

test("a high-volatility claim is due past its bi-weekly window, a low one is not", () => {
  const due = dueClaims(claims, { now }).map((c) => c.id);
  assert.deepEqual(due, ["fast-claim", "never-checked"]);
});

test("nothing is due inside every window", () => {
  const fresh = new Date("2026-08-10T00:00:00Z"); // 9 days after verification
  const due = dueClaims(claims, { now: fresh }).map((c) => c.id);
  assert.deepEqual(due, ["never-checked"]); // null verified_on is always due
});

test("--volatility filters to one band", () => {
  assert.deepEqual(dueClaims(claims, { now, volatility: "high" }).map((c) => c.id), ["fast-claim"]);
  assert.deepEqual(dueClaims(claims, { now, volatility: "low" }), []);
  assert.deepEqual(dueClaims(claims, { now, volatility: "all" }).map((c) => c.id), [
    "fast-claim",
    "never-checked",
  ]);
});

test("an unparseable verified_on is treated as due", () => {
  const broken = [{ id: "x", volatility: "low", verifiedOn: "not-a-date" }];
  assert.deepEqual(dueClaims(broken, { now }).map((c) => c.id), ["x"]);
});

test("the real registry parses and every band has a re-check window", () => {
  const registry = parseRegistry(readFileSync(new URL("./sources.yaml", import.meta.url), "utf8"));
  assert.equal(registry.length, 52);
  for (const claim of registry) {
    assert.ok(RECHECK_DAYS[claim.volatility], `unknown volatility "${claim.volatility}" on ${claim.id}`);
  }
});
