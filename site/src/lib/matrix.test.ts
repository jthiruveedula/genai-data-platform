import { describe, expect, it } from "vitest";
import {
  ariaSortFor,
  buildMatrixRows,
  compareRows,
  cycleColumnSort,
  indicatorFor,
  INITIAL_SORT_STATE,
  sortRows,
  toggleStageSort,
  type FlavorsByCloud,
  type MatrixModule,
  type SortState,
} from "./matrix";
import type { CloudId } from "../data/modules";

const CLOUDS: CloudId[] = ["gcp", "aws", "azure", "oss"];

const modules: MatrixModule[] = [
  { id: "10-ingestion", order: 10, title: "Ingestion" },
  { id: "00-foundations", order: 0, title: "Foundations" },
  { id: "45-evaluation", order: 45, title: "Evaluation" },
];

const flavorsByCloud: FlavorsByCloud = {
  gcp: {
    "00-foundations": { services: ["Vertex AI"], storage: "N/A" },
    "10-ingestion": { services: ["Cloud Storage", "Dataflow"], storage: "GCS" },
    "45-evaluation": { services: ["Vertex AI evaluation"], storage: "BigQuery" },
  },
  aws: {
    "00-foundations": { services: ["Bedrock"], storage: "N/A" },
    "10-ingestion": { services: ["S3", "Glue"], storage: "S3" },
    // 45-evaluation intentionally missing for aws
  },
  azure: {
    "00-foundations": { services: ["Azure OpenAI"], storage: "N/A" },
    "10-ingestion": { services: ["Blob Storage"], storage: "Blob" },
    "45-evaluation": { services: ["Azure AI evaluation"], storage: "Blob" },
  },
  oss: {
    "00-foundations": { services: ["vLLM"], storage: "N/A" },
    "10-ingestion": { services: ["MinIO"], storage: "MinIO" },
    "45-evaluation": { services: ["Ragas"], storage: "Postgres" },
  },
};

describe("buildMatrixRows", () => {
  const rows = buildMatrixRows(modules, flavorsByCloud, CLOUDS);

  it("orders rows by module.order regardless of input order", () => {
    expect(rows.map((r) => r.id)).toEqual(["00-foundations", "10-ingestion", "45-evaluation"]);
  });

  it("zero-pads the order label", () => {
    expect(rows.find((r) => r.id === "00-foundations")!.orderLabel).toBe("00");
    expect(rows.find((r) => r.id === "10-ingestion")!.orderLabel).toBe("10");
    expect(rows.find((r) => r.id === "45-evaluation")!.orderLabel).toBe("45");
  });

  it("carries through the flavor cell for a present entry", () => {
    const row = rows.find((r) => r.id === "10-ingestion")!;
    expect(row.cells.gcp).toEqual({ services: ["Cloud Storage", "Dataflow"], storage: "GCS" });
  });

  it("leaves the cell undefined when a flavor has no entry for the module", () => {
    const row = rows.find((r) => r.id === "45-evaluation")!;
    expect(row.cells.aws).toBeUndefined();
  });

  it("extracts and lowercases the first service as the sort key", () => {
    const row = rows.find((r) => r.id === "10-ingestion")!;
    expect(row.firstService.gcp).toBe("cloud storage");
    expect(row.firstService.aws).toBe("s3");
  });

  it("leaves firstService undefined when the cell is missing", () => {
    const row = rows.find((r) => r.id === "45-evaluation")!;
    expect(row.firstService.aws).toBeUndefined();
  });

  it("leaves firstService undefined when services is empty", () => {
    const emptyModules: MatrixModule[] = [{ id: "x", order: 1, title: "X" }];
    const emptyFlavors: FlavorsByCloud = {
      gcp: { x: { services: [], storage: "N/A" } },
      aws: {},
      azure: {},
      oss: {},
    };
    const [row] = buildMatrixRows(emptyModules, emptyFlavors, CLOUDS);
    expect(row.firstService.gcp).toBeUndefined();
  });
});

describe("sort state machine", () => {
  it("toggleStageSort flips pipeline <-> alphabetical and clears column sort", () => {
    let state = toggleStageSort(INITIAL_SORT_STATE);
    expect(state.rowOrder).toBe("alphabetical");
    expect(state.sortColumn).toBeNull();

    state = toggleStageSort(state);
    expect(state.rowOrder).toBe("pipeline");
  });

  it("toggleStageSort clears an active column sort", () => {
    const withColumn: SortState = { rowOrder: "pipeline", sortColumn: "aws", sortDirection: "desc" };
    const next = toggleStageSort(withColumn);
    expect(next.sortColumn).toBeNull();
    expect(next.rowOrder).toBe("alphabetical");
  });

  it("cycleColumnSort starts a new column at asc", () => {
    const state = cycleColumnSort(INITIAL_SORT_STATE, "gcp");
    expect(state.sortColumn).toBe("gcp");
    expect(state.sortDirection).toBe("asc");
  });

  it("cycleColumnSort toggles asc -> desc -> asc on the same column", () => {
    let state = cycleColumnSort(INITIAL_SORT_STATE, "gcp");
    state = cycleColumnSort(state, "gcp");
    expect(state.sortDirection).toBe("desc");
    state = cycleColumnSort(state, "gcp");
    expect(state.sortDirection).toBe("asc");
  });

  it("cycleColumnSort switching to a different column resets to asc", () => {
    let state = cycleColumnSort(INITIAL_SORT_STATE, "gcp");
    state = cycleColumnSort(state, "gcp"); // now desc
    state = cycleColumnSort(state, "aws");
    expect(state.sortColumn).toBe("aws");
    expect(state.sortDirection).toBe("asc");
  });
});

describe("compareRows", () => {
  const rows = buildMatrixRows(modules, flavorsByCloud, CLOUDS);
  const foundations = rows.find((r) => r.id === "00-foundations")!;
  const ingestion = rows.find((r) => r.id === "10-ingestion")!;
  const evaluation = rows.find((r) => r.id === "45-evaluation")!;

  it("pipeline mode orders by module.order", () => {
    const state: SortState = { rowOrder: "pipeline", sortColumn: null, sortDirection: "asc" };
    expect(compareRows(foundations, ingestion, state)).toBeLessThan(0);
    expect(compareRows(ingestion, foundations, state)).toBeGreaterThan(0);
  });

  it("alphabetical mode orders by title", () => {
    const state: SortState = { rowOrder: "alphabetical", sortColumn: null, sortDirection: "asc" };
    // "Evaluation" < "Foundations" < "Ingestion"
    expect(compareRows(evaluation, foundations, state)).toBeLessThan(0);
    expect(compareRows(foundations, ingestion, state)).toBeLessThan(0);
  });

  it("alphabetical mode ties break by pipeline order", () => {
    const state: SortState = { rowOrder: "alphabetical", sortColumn: null, sortDirection: "asc" };
    expect(compareRows(foundations, foundations, state)).toBe(0);
  });

  it("per-cloud asc sorts by first service ascending", () => {
    const state: SortState = { rowOrder: "pipeline", sortColumn: "gcp", sortDirection: "asc" };
    // cloud storage < vertex ai
    expect(compareRows(ingestion, foundations, state)).toBeLessThan(0);
  });

  it("per-cloud desc reverses the comparison", () => {
    const state: SortState = { rowOrder: "pipeline", sortColumn: "gcp", sortDirection: "desc" };
    expect(compareRows(ingestion, foundations, state)).toBeGreaterThan(0);
  });

  it("rows missing an entry for the sort column sink to the bottom in asc", () => {
    const state: SortState = { rowOrder: "pipeline", sortColumn: "aws", sortDirection: "asc" };
    // evaluation has no aws entry -> should sort after ones that do
    expect(compareRows(evaluation, foundations, state)).toBeGreaterThan(0);
    expect(compareRows(foundations, evaluation, state)).toBeLessThan(0);
  });

  it("rows missing an entry for the sort column sink to the bottom in desc too", () => {
    const state: SortState = { rowOrder: "pipeline", sortColumn: "aws", sortDirection: "desc" };
    expect(compareRows(evaluation, foundations, state)).toBeGreaterThan(0);
    expect(compareRows(foundations, evaluation, state)).toBeLessThan(0);
  });

  it("two rows both missing the sort column's entry tie-break by pipeline order", () => {
    const modulesWithTwoMissing: MatrixModule[] = [
      { id: "a", order: 5, title: "A" },
      { id: "b", order: 2, title: "B" },
    ];
    const flavors: FlavorsByCloud = { gcp: {}, aws: {}, azure: {}, oss: {} };
    const built = buildMatrixRows(modulesWithTwoMissing, flavors, CLOUDS);
    const a = built.find((r) => r.id === "a")!;
    const b = built.find((r) => r.id === "b")!;
    const state: SortState = { rowOrder: "pipeline", sortColumn: "gcp", sortDirection: "asc" };
    // a.order (5) > b.order (2) -> b should come first
    expect(compareRows(a, b, state)).toBeGreaterThan(0);
    expect(compareRows(b, a, state)).toBeLessThan(0);
  });

  it("sortRows applies compareRows across the whole set", () => {
    const state: SortState = { rowOrder: "pipeline", sortColumn: "gcp", sortDirection: "asc" };
    const sorted = sortRows(rows, state);
    // gcp first services: ingestion="cloud storage" < foundations="vertex ai" < evaluation="vertex ai evaluation"
    expect(sorted.map((r) => r.id)).toEqual(["10-ingestion", "00-foundations", "45-evaluation"]);
  });
});

describe("ariaSortFor / indicatorFor", () => {
  it("Stage header is 'none' in pipeline mode", () => {
    const state: SortState = { rowOrder: "pipeline", sortColumn: null, sortDirection: "asc" };
    expect(ariaSortFor(state, null)).toBe("none");
    expect(indicatorFor(state, null)).toBe("");
  });

  it("Stage header is 'ascending' in alphabetical mode", () => {
    const state: SortState = { rowOrder: "alphabetical", sortColumn: null, sortDirection: "asc" };
    expect(ariaSortFor(state, null)).toBe("ascending");
    expect(indicatorFor(state, null)).toContain("A–Z");
  });

  it("Stage header reports 'none' when a column sort is active", () => {
    const state: SortState = { rowOrder: "alphabetical", sortColumn: "gcp", sortDirection: "asc" };
    expect(ariaSortFor(state, null)).toBe("none");
  });

  it("inactive column headers report 'none'", () => {
    const state: SortState = { rowOrder: "pipeline", sortColumn: "gcp", sortDirection: "asc" };
    expect(ariaSortFor(state, "aws")).toBe("none");
    expect(indicatorFor(state, "aws")).toBe("");
  });

  it("active column header reports its direction", () => {
    const asc: SortState = { rowOrder: "pipeline", sortColumn: "aws", sortDirection: "asc" };
    expect(ariaSortFor(asc, "aws")).toBe("ascending");
    expect(indicatorFor(asc, "aws")).toBe("▲");

    const desc: SortState = { rowOrder: "pipeline", sortColumn: "aws", sortDirection: "desc" };
    expect(ariaSortFor(desc, "aws")).toBe("descending");
    expect(indicatorFor(desc, "aws")).toBe("▼");
  });
});
