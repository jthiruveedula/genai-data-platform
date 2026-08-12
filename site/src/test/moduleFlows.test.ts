import { describe, expect, it } from "vitest";
import { MODULE_FLOWS, type FlowShape } from "../data/moduleFlows";
import { MODULES } from "../data/modules";

const SHAPES: FlowShape[] = ["line", "fan-in", "split", "fork", "fuse", "stack", "loop"];

describe("module mechanism flows", () => {
  it("registers a flow for every module", () => {
    // ModuleFlowDiagram throws at build time on a missing flow, but that only
    // fails the page that happens to be built first; this names the module.
    for (const mod of MODULES) {
      expect(MODULE_FLOWS[mod.id], `no flow for ${mod.id}`).toBeDefined();
    }
    expect(Object.keys(MODULE_FLOWS).sort()).toEqual(MODULES.map((m) => m.id).sort());
  });

  it("gives every flow a known shape", () => {
    for (const [id, flow] of Object.entries(MODULE_FLOWS)) {
      expect(SHAPES, `${id} has shape "${flow.shape}"`).toContain(flow.shape);
    }
  });

  it("declares mergeAt on exactly the fuse flows, in range", () => {
    for (const [id, flow] of Object.entries(MODULE_FLOWS)) {
      if (flow.shape === "fuse") {
        // The 3D layout doubles the leg INTO this step, so it can be neither
        // the first station (nothing upstream to split) nor out of range.
        expect(flow.mergeAt, `${id} is fuse but declares no mergeAt`).toBeTypeOf("number");
        expect(flow.mergeAt!).toBeGreaterThanOrEqual(1);
        expect(flow.mergeAt!).toBeLessThan(flow.steps.length);
      } else {
        expect(flow.mergeAt, `${id} is ${flow.shape} but declares mergeAt`).toBeUndefined();
      }
    }
  });

  it("keeps every flow to a readable 3-5 stations with real copy", () => {
    for (const [id, flow] of Object.entries(MODULE_FLOWS)) {
      expect(flow.steps.length, `${id} step count`).toBeGreaterThanOrEqual(3);
      expect(flow.steps.length, `${id} step count`).toBeLessThanOrEqual(5);
      expect(flow.kicker.trim().length, `${id} kicker`).toBeGreaterThan(0);
      for (const step of flow.steps) {
        expect(step.label.trim().length, `${id} step label`).toBeGreaterThan(0);
        expect(step.detail.trim().length, `${id} step detail`).toBeGreaterThan(0);
      }
    }
  });
});
