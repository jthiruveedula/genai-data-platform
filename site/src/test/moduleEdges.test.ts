import { describe, expect, it } from "vitest";
import { MODULES } from "../data/modules";
import { MODULE_EDGES, feedsFrom, readsInto } from "../data/moduleEdges";

const IDS = new Set(MODULES.map((m) => m.id));

describe("module wiring graph", () => {
  it("only joins modules that exist", () => {
    for (const edge of MODULE_EDGES) {
      expect(IDS.has(edge.from), `unknown module "${edge.from}"`).toBe(true);
      expect(IDS.has(edge.to), `unknown module "${edge.to}"`).toBe(true);
    }
  });

  it("never points a module at itself", () => {
    for (const edge of MODULE_EDGES) {
      expect(edge.from, "self-edge").not.toBe(edge.to);
    }
  });

  it("states a reason on every edge", () => {
    for (const edge of MODULE_EDGES) {
      // The reason is shown to the reader, so an empty or stub one is a bug.
      expect(edge.why.trim().length, `${edge.from} → ${edge.to}`).toBeGreaterThan(25);
      expect(edge.why.trim().endsWith("."), `${edge.from} → ${edge.to} reads as a sentence`).toBe(true);
    }
  });

  it("declares each pair once in each direction", () => {
    const seen = new Set<string>();
    for (const edge of MODULE_EDGES) {
      const key = `${edge.from}->${edge.to}`;
      expect(seen.has(key), `duplicate edge ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("leaves no module unwired", () => {
    // An orphan means either a missing edge or a module that does not belong in
    // the curriculum — both worth failing a build over.
    for (const mod of MODULES) {
      const degree = feedsFrom(mod.id).length + readsInto(mod.id).length;
      expect(degree, `${mod.id} is not wired to anything`).toBeGreaterThan(0);
    }
  });

  it("derives both directions from the one list", () => {
    for (const edge of MODULE_EDGES) {
      expect(feedsFrom(edge.to)).toContain(edge);
      expect(readsInto(edge.from)).toContain(edge);
    }
  });
});
