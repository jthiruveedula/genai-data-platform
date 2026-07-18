// Parser + status helpers for the claim registry (validation/sources.yaml).
//
// The registry is a hand-authored, deliberately rigid YAML subset (see
// PLAN.md §9.1 and the header comment in sources.yaml) — one `claims:` list,
// each entry exactly:
//
//   - id: <slug>
//     used_by: site/src/data/flavors/<cloud>.ts#<module-id>
//     claim: "<sentence>"
//     sources: []            # or a block list, one URL per "- https://..." line
//     volatility: low|medium|high
//     verified_on: null      # or an ISO date string "2026-07-01"
//
// Rather than pull in a full YAML parser for this one rigid shape, this file
// hand-rolls a line-based parser scoped to exactly that shape. It is NOT a
// general YAML parser — it will mis-parse anything outside this subset
// (e.g. flow-style mappings other than the single-line `extract_schema: {...}`
// entries, which are read and intentionally ignored since Claim doesn't model
// them).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export type Volatility = "low" | "medium" | "high";

export interface Claim {
  id: string;
  usedBy: string;
  claim: string;
  sources: string[];
  volatility: Volatility;
  verifiedOn: string | null;
}

export type ClaimStatus = "verified" | "stale" | "unverified";

// Node-only registry loader, shared by the pages/components that need the
// live claim list at build time (freshness.astro, FlavorTabs.astro,
// BaseLayout.astro's footer). Kept in this module (rather than duplicated
// per-caller) so there is exactly one place that knows how to find
// validation/sources.yaml relative to the build's cwd.
let cachedClaims: Claim[] | null = null;

/**
 * Read + parse validation/sources.yaml. `astro build` runs with cwd = site/,
 * so the registry is one directory up from that; resolved a few ways so this
 * survives being invoked from a different cwd without a hardcoded absolute
 * path. Results are cached for the lifetime of the process (a single build).
 */
export function loadClaims(): Claim[] {
  if (cachedClaims) return cachedClaims;

  const hereDir = path.dirname(fileURLToPath(import.meta.url)); // .../site/src/lib
  const candidates = [
    path.resolve(hereDir, "../../../validation/sources.yaml"), // relative to this file
    path.resolve(process.cwd(), "../validation/sources.yaml"), // cwd = site/
    path.resolve(process.cwd(), "validation/sources.yaml"), // cwd = repo root
  ];

  for (const candidate of candidates) {
    try {
      const text = readFileSync(candidate, "utf-8");
      cachedClaims = parseClaims(text);
      return cachedClaims;
    } catch {
      // try the next candidate
    }
  }

  throw new Error(`claim registry not found; tried:\n${candidates.join("\n")}`);
}

export function findClaim(claims: Claim[], id: string): Claim | undefined {
  return claims.find((c) => c.id === id);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STALE_AFTER_DAYS = 90;

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

interface InProgressClaim {
  id: string;
  usedBy: string;
  claim: string;
  sources: string[];
  volatility: Volatility;
  verifiedOn: string | null;
}

/**
 * Parse the claim registry's rigid YAML subset into typed Claim records.
 * Unknown/extra keys (e.g. `extract_schema` on pricing claims) are read and
 * silently ignored — Claim only models the fields the site renders.
 */
export function parseClaims(yamlText: string): Claim[] {
  const lines = yamlText.split(/\r?\n/);
  const claims: Claim[] = [];

  let current: InProgressClaim | null = null;
  let collectingSources = false;

  const flush = () => {
    if (current) claims.push(current);
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const idMatch = trimmed.match(/^-\s*id:\s*(.+)$/);
    if (idMatch) {
      flush();
      current = {
        id: idMatch[1].trim(),
        usedBy: "",
        claim: "",
        sources: [],
        volatility: "low",
        verifiedOn: null,
      };
      collectingSources = false;
      continue;
    }

    if (!current) continue; // lines before the first entry (e.g. "claims:")

    if (collectingSources) {
      const sourceItemMatch = trimmed.match(/^-\s*(\S+)\s*$/);
      if (sourceItemMatch) {
        current.sources.push(sourceItemMatch[1]);
        continue;
      }
      collectingSources = false;
    }

    const kvMatch = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kvMatch) continue;
    const [, key, rawValue] = kvMatch;
    const value = rawValue.trim();

    switch (key) {
      case "used_by":
        current.usedBy = value;
        break;
      case "claim":
        current.claim = stripQuotes(value);
        break;
      case "sources":
        if (value === "" ) {
          // Block-list form: subsequent "- https://..." lines follow.
          current.sources = [];
          collectingSources = true;
        } else if (value === "[]") {
          current.sources = [];
        } else {
          // Defensive: inline flow-list form, e.g. sources: [a, b]
          current.sources = value
            .replace(/^\[/, "")
            .replace(/\]$/, "")
            .split(",")
            .map((s) => stripQuotes(s.trim()))
            .filter(Boolean);
        }
        break;
      case "volatility":
        current.volatility = value as Volatility;
        break;
      case "verified_on":
        current.verifiedOn = value === "null" || value === "" ? null : stripQuotes(value);
        break;
      default:
        // Ignore unmodeled keys (e.g. extract_schema).
        break;
    }
  }

  flush();
  return claims;
}

/**
 * A claim is:
 * - "unverified" when it has never been checked (verified_on is null)
 * - "stale" when it was checked, but more than 90 days before `now`
 * - "verified" when it was checked within the last 90 days
 */
export function claimStatus(claim: Claim, now: Date = new Date()): ClaimStatus {
  if (!claim.verifiedOn) return "unverified";
  const verifiedDate = new Date(claim.verifiedOn);
  if (Number.isNaN(verifiedDate.getTime())) return "unverified";
  const ageDays = (now.getTime() - verifiedDate.getTime()) / MS_PER_DAY;
  return ageDays > STALE_AFTER_DAYS ? "stale" : "verified";
}
