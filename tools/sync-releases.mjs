#!/usr/bin/env node
/**
 * Regenerate `site/src/data/releases.ts` from the repo's actual GitHub releases.
 *
 * The changelog page is built from committed data, not fetched at runtime: this
 * is a static site, a visitor should not need GitHub to be up to read what
 * shipped, and a build must be reproducible from the repo alone.
 *
 * The headline and the "what changed" lines are NOT generated — a release note
 * written by a machine from commit subjects reads like one. They are authored in
 * releases.ts and preserved across a sync; this script only ever adds releases
 * it finds and refreshes tag/date/title, so re-running it after cutting a
 * release gives you a stub to write into rather than clobbering your prose.
 *
 * Usage:  node tools/sync-releases.mjs        (writes the file)
 *         node tools/sync-releases.mjs --check (fails if out of date — CI)
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(repoRoot, "site/src/data/releases.ts");

const raw = execFileSync(
  "gh",
  ["release", "list", "--limit", "100", "--json", "tagName,name,publishedAt,isLatest"],
  { encoding: "utf8" },
);
const releases = JSON.parse(raw)
  .map((r) => ({
    tag: r.tagName,
    date: r.publishedAt.slice(0, 10),
    // GitHub titles are "v1.8.0 — the headline"; the tag is already a field.
    title: String(r.name || "").replace(/^v[\d.]+\s*[—-]\s*/, "").trim() || r.tagName,
    isLatest: Boolean(r.isLatest),
  }))
  // Semantic sort, not lexicographic. String comparison put "v1.10.0" BELOW
  // "v1.9.0" — '1' sorts before '9' — which buried a release mid-list the
  // first time the minor version reached double digits.
  .sort((a, b) => {
    const parts = (t) => t.replace(/^v/, "").split(".").map(Number);
    const [aMaj, aMin, aPatch] = parts(a.tag);
    const [bMaj, bMin, bPatch] = parts(b.tag);
    return bMaj - aMaj || bMin - aMin || bPatch - aPatch;
  });

// Preserve any authored prose already in the file, keyed by tag.
let existing = {};
try {
  const current = readFileSync(target, "utf8");
  for (const match of current.matchAll(
    /tag:\s*"([^"]+)"[\s\S]*?summary:\s*"((?:[^"\\]|\\.)*)"/g,
  )) {
    existing[match[1]] = match[2];
  }
} catch {
  // First run — nothing to preserve.
}

const body = releases
  .map((r) => {
    const summary = existing[r.tag] ?? "";
    // A tag GitHub reports is a tag that exists: any `pending` flag on it is
    // now stale, so it is simply not re-emitted.
    return `  {
    tag: ${JSON.stringify(r.tag)},
    date: ${JSON.stringify(r.date)},
    title: ${JSON.stringify(r.title)},
    summary: "${summary}",${r.isLatest ? "\n    isLatest: true," : ""}
  },`;
  })
  .join("\n");

const file = `/**
 * Every release of this site, as data.
 *
 * GENERATED LIST, AUTHORED PROSE: \`tools/sync-releases.mjs\` refreshes the tag,
 * date and title from GitHub and adds releases it finds, but never overwrites a
 * \`summary\` — those are written by hand, because a changelog assembled from
 * commit subjects reads like it was assembled from commit subjects.
 *
 * Committed rather than fetched: this is a static site, and a visitor should
 * not need GitHub to be reachable to read what shipped.
 */

export interface Release {
  /** Git tag, e.g. "v1.8.0". */
  tag: string;
  /** ISO date the release was published. */
  date: string;
  /** The release's own headline, without the version prefix. */
  title: string;
  /** One or two sentences on what it changed and why. Authored, not generated. */
  summary: string;
  isLatest?: boolean;
}

export const RELEASES: Release[] = [
${body}
];

/** The most recent release, for the "what's new" line elsewhere on the site. */
export const LATEST: Release = RELEASES.find((r) => r.isLatest) ?? RELEASES[0];
`;

if (process.argv.includes("--check")) {
  const current = readFileSync(target, "utf8");
  if (current.trim() !== file.trim()) {
    console.error(
      "site/src/data/releases.ts is out of date with the published releases.\n" +
        "Run: node tools/sync-releases.mjs",
    );
    process.exit(1);
  }
  console.log(`OK — ${releases.length} releases in sync.`);
} else {
  writeFileSync(target, file);
  const blank = releases.filter((r) => !existing[r.tag]).length;
  console.log(
    `Wrote ${releases.length} releases to site/src/data/releases.ts` +
      (blank ? ` — ${blank} still need a summary written.` : ""),
  );
}
