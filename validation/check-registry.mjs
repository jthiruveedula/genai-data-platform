#!/usr/bin/env node
// Fails CI if any claimId used in site/src/data/flavors/*.ts or
// site/src/data/pricing.json has no matching entry in
// validation/sources.yaml, or if the registry has stale entries nothing
// references anymore. Keeps PLAN.md §9.1's claim registry from silently
// drifting out of sync with content changes.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const flavorsDir = path.join(repoRoot, "site/src/data/flavors");
const pricingPath = path.join(repoRoot, "site/src/data/pricing.json");
const registryPath = path.join(repoRoot, "validation/sources.yaml");

const usedClaimIds = new Set();
for (const file of readdirSync(flavorsDir)) {
  if (!file.endsWith(".ts")) continue;
  const content = readFileSync(path.join(flavorsDir, file), "utf8");
  for (const match of content.matchAll(/claimId:\s*"([^"]+)"/g)) {
    usedClaimIds.add(match[1]);
  }
}

const pricing = JSON.parse(readFileSync(pricingPath, "utf8"));
for (const entry of Object.values(pricing)) {
  if (entry.claimId) usedClaimIds.add(entry.claimId);
}

const registryContent = readFileSync(registryPath, "utf8");
const registeredClaimIds = new Set(
  [...registryContent.matchAll(/^\s*- id:\s*(\S+)/gm)].map((m) => m[1]),
);

const missing = [...usedClaimIds].filter((id) => !registeredClaimIds.has(id));
const stale = [...registeredClaimIds].filter((id) => !usedClaimIds.has(id));

if (missing.length || stale.length) {
  if (missing.length) {
    console.error(`Missing from validation/sources.yaml (used in flavors/*.ts or pricing.json but not registered):`);
    missing.forEach((id) => console.error(`  - ${id}`));
  }
  if (stale.length) {
    console.error(`Stale in validation/sources.yaml (registered but nothing references it):`);
    stale.forEach((id) => console.error(`  - ${id}`));
  }
  console.error(`\nEvery claimId in flavors/*.ts or pricing.json must have exactly one entry in validation/sources.yaml.`);
  process.exit(1);
}

console.log(`OK — ${usedClaimIds.size} claimIds match exactly between content files and validation/sources.yaml.`);
