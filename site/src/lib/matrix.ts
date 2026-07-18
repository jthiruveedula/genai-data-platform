import type { CloudId } from "../data/modules";

/** Structural slice of FlavorEntry — deliberately not importing the real
 * type from data/flavors/* so this file can't churn against concurrent
 * flavor-data edits. Only the fields the matrix actually renders/sorts on. */
export interface FlavorCell {
  services: string[];
  storage: string;
}

export interface MatrixModule {
  id: string;
  order: number;
  title: string;
}

export type FlavorsByCloud = Record<CloudId, Record<string, FlavorCell | undefined>>;

export interface MatrixRow {
  id: string;
  order: number;
  title: string;
  /** Zero-padded order label, e.g. "05", "45". */
  orderLabel: string;
  cells: Record<CloudId, FlavorCell | undefined>;
  /** Lowercased first entry of cells[cloud].services, or undefined if no
   * entry/empty services — used for per-column sorting. */
  firstService: Record<CloudId, string | undefined>;
}

/** Builds one row per module, joining in each cloud's flavor entry (if any). */
export function buildMatrixRows(modules: MatrixModule[], flavorsByCloud: FlavorsByCloud, clouds: CloudId[]): MatrixRow[] {
  return modules
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((mod) => {
      const cells = {} as Record<CloudId, FlavorCell | undefined>;
      const firstService = {} as Record<CloudId, string | undefined>;
      for (const cloud of clouds) {
        const cell = flavorsByCloud[cloud]?.[mod.id];
        cells[cloud] = cell;
        const first = cell?.services?.[0];
        firstService[cloud] = first ? first.toLowerCase() : undefined;
      }
      return {
        id: mod.id,
        order: mod.order,
        title: mod.title,
        orderLabel: String(mod.order).padStart(2, "0"),
        cells,
        firstService,
      };
    });
}

/** Row ordering modes for the "Stage" header. */
export type RowOrder = "pipeline" | "alphabetical";

/** Column sort direction for a cloud header; "none" means no active column sort
 * (row order is governed by `RowOrder` instead). */
export type SortDirection = "asc" | "desc";

export interface SortState {
  rowOrder: RowOrder;
  /** The cloud column currently driving sort, or null if the Stage column
   * (rowOrder) is in control. */
  sortColumn: CloudId | null;
  sortDirection: SortDirection;
}

export const INITIAL_SORT_STATE: SortState = {
  rowOrder: "pipeline",
  sortColumn: null,
  sortDirection: "asc",
};

/** Clicking the "Stage" header: toggles pipeline <-> alphabetical, and clears
 * any active column sort (column sort and stage sort are mutually exclusive). */
export function toggleStageSort(state: SortState): SortState {
  return {
    rowOrder: state.rowOrder === "pipeline" ? "alphabetical" : "pipeline",
    sortColumn: null,
    sortDirection: "asc",
  };
}

/** Clicking a cloud column header: first click on a new column sorts asc,
 * repeated clicks on the same column cycle asc -> desc -> asc. */
export function cycleColumnSort(state: SortState, cloud: CloudId): SortState {
  if (state.sortColumn !== cloud) {
    return { ...state, sortColumn: cloud, sortDirection: "asc" };
  }
  return { ...state, sortColumn: cloud, sortDirection: state.sortDirection === "asc" ? "desc" : "asc" };
}

/** Comparator used to order rows for a given sort state. Rows lacking an
 * entry for the active sort column always sink to the bottom, regardless of
 * sort direction; ties (including "both missing") break by pipeline order. */
export function compareRows(a: MatrixRow, b: MatrixRow, state: SortState): number {
  if (state.sortColumn) {
    const cloud = state.sortColumn;
    const av = a.firstService[cloud];
    const bv = b.firstService[cloud];
    if (av === undefined && bv === undefined) return a.order - b.order;
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    if (av !== bv) {
      const cmp = av < bv ? -1 : 1;
      return state.sortDirection === "asc" ? cmp : -cmp;
    }
    return a.order - b.order;
  }

  if (state.rowOrder === "alphabetical") {
    if (a.title !== b.title) return a.title < b.title ? -1 : 1;
    return a.order - b.order;
  }

  return a.order - b.order;
}

export function sortRows(rows: MatrixRow[], state: SortState): MatrixRow[] {
  return rows.slice().sort((a, b) => compareRows(a, b, state));
}

/** aria-sort value for a given header, given the current sort state.
 * `column` is null for the Stage header. */
export function ariaSortFor(state: SortState, column: CloudId | null): "ascending" | "descending" | "none" {
  if (column === null) {
    // Stage header only reflects an aria-sort state when it's actually
    // driving order (no column sort active).
    if (state.sortColumn !== null) return "none";
    return state.rowOrder === "alphabetical" ? "ascending" : "none";
  }
  if (state.sortColumn !== column) return "none";
  return state.sortDirection === "asc" ? "ascending" : "descending";
}

/** Small glyph/text indicator to render next to a header's label. */
export function indicatorFor(state: SortState, column: CloudId | null): string {
  if (column === null) {
    if (state.sortColumn !== null) return "";
    return state.rowOrder === "alphabetical" ? "▲ A–Z" : "";
  }
  if (state.sortColumn !== column) return "";
  return state.sortDirection === "asc" ? "▲" : "▼";
}
