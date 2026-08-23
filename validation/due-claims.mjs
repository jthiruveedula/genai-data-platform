#!/usr/bin/env node
// Selects which claims in validation/sources.yaml are due for
// re-verification, so the scrape pipeline (.github/workflows/crawl4ai.yml)
// only spends crawl budget on claims whose cadence has actually elapsed
// rather than re-checking all 52 every run.
//
// Cadence is per-volatility (PLAN.md §9.1): GenAI pricing and model names
// churn — tier renames, price cuts, deprecations — far faster than the rest
// of the registry, so `high` gets a bi-weekly window while `medium` and
// `low` keep the slower ones. A claim that has never been verified
// (verified_on: null) is always due.
//
// Usage:
//   node validation/due-claims.mjs                    # everything that's due
//   node validation/due-claims.mjs --volatility high  # one band only
// Prints one claim id per line; empty output means nothing is due.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Keep in sync with STALE_AFTER_DAYS in site/src/lib/claims.ts — that's what
// turns a past-cadence claim amber on the freshness page, this is what picks
// it up for re-checking. Duplicated rather than shared because this is a
// plain node script and that one is TypeScript inside the Astro build.
export const RECHECK_DAYS = { high: 14, medium: 90, low: 180 };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Read the registry's id / volatility / verified_on triples. Same rigid-YAML
 * assumption (and same line-scan approach) as check-registry.mjs — not a
 * general parser, just enough of one for this file's fixed shape.
 */
export function parseRegistry(text) {
  const claims = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    const id = trimmed.match(/^- id:\s*(\S+)/);
    if (id) {
      claims.push({ id: id[1], volatility: "low", verifiedOn: null });
      continue;
    }
    const current = claims[claims.length - 1];
    if (!current) continue; // lines before the first entry (e.g. "claims:")
    const volatility = trimmed.match(/^volatility:\s*(\S+)/);
    if (volatility) current.volatility = volatility[1];
    const verifiedOn = trimmed.match(/^verified_on:\s*(\S+)/);
    if (verifiedOn) {
      const value = verifiedOn[1].replace(/^["']|["']$/g, "");
      current.verifiedOn = value === "null" ? null : value;
    }
  }
  return claims;
}

/**
 * Claims past their volatility's re-check window. `volatility` filters to a
 * single band ("all" or null = every band). Never-verified and
 * unparseable-date claims count as due — erring toward re-checking is the
 * cheap mistake here.
 */
export function dueClaims(claims, { now = new Date(), volatility = null } = {}) {
  return claims.filter((claim) => {
    if (volatility && volatility !== "all" && claim.volatility !== volatility) return false;
    if (!claim.verifiedOn) return true;
    const ageDays = (now.getTime() - new Date(claim.verifiedOn).getTime()) / MS_PER_DAY;
    if (Number.isNaN(ageDays)) return true;
    return ageDays >= (RECHECK_DAYS[claim.volatility] ?? RECHECK_DAYS.low);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flagIndex = process.argv.indexOf("--volatility");
  const volatility = flagIndex === -1 ? null : process.argv[flagIndex + 1];
  const registryPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "sources.yaml",
  );
  const claims = parseRegistry(readFileSync(registryPath, "utf8"));
  for (const claim of dueClaims(claims, { volatility })) console.log(claim.id);
}
