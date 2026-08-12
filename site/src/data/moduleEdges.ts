/**
 * How the modules actually wire together.
 *
 * The prose has always asserted this graph — Module 20's flow says its input is
 * "Output of Module 15's splitter", Module 55's recap says Module 75's cost
 * model is a join against its event log, Module 85's says an agent calls the
 * same retrieval and generation services every other module built. Those claims
 * were readable but not navigable, and nothing stopped one of them from drifting
 * out of step with the module it names.
 *
 * So the graph is stored once, as directed edges, and both directions are
 * derived (`feedsFrom` / `readsInto`). There is no second list to keep in sync,
 * and `moduleEdges.test.ts` enforces that every endpoint is a real module, that
 * nothing points at itself, and that every module is reachable — an orphaned
 * module means either a missing edge or a module that doesn't belong.
 *
 * `why` is the claim being made, in the module's own terms. It is shown to the
 * reader, so it has to be true of the two modules it joins, not decorative.
 */

import { MODULES } from "./modules";

export interface ModuleEdge {
  /** The upstream module: the one that produces or hosts what `to` needs. */
  from: string;
  /** The downstream module: the one that consumes it. */
  to: string;
  why: string;
}

export const MODULE_EDGES: ModuleEdge[] = [
  {
    from: "00-foundations",
    to: "10-ingestion",
    why: "The vocabulary — tokens, embeddings, retrieval — that the pipeline's first stage assumes.",
  },
  {
    from: "00-foundations",
    to: "20-embeddings",
    why: "Text becoming a vector is the mechanism this module then has to store and search.",
  },
  {
    from: "10-ingestion",
    to: "15-chunking",
    why: "Chunking splits the parsed document, with the layout ingestion extracted.",
  },
  {
    from: "10-ingestion",
    to: "38-multimodal",
    why: "Every format needs its own extraction path before anything can be embedded.",
  },
  {
    from: "15-chunking",
    to: "20-embeddings",
    why: "Each chunk is what gets embedded — chunk boundaries decide what a vector can mean.",
  },
  {
    from: "15-chunking",
    to: "35-retrieval",
    why: "Chunk size sets the ceiling on retrieval precision before any reranker runs.",
  },
  {
    from: "20-embeddings",
    to: "35-retrieval",
    why: "Dense search is a nearest-neighbour query against the index this module builds.",
  },
  {
    from: "20-embeddings",
    to: "25-serving",
    why: "Serving embeds the query with the same model, then asks the index for top-k.",
  },
  {
    from: "38-multimodal",
    to: "20-embeddings",
    why: "Frames and transcripts need an embedding space of their own, tagged by modality.",
  },
  {
    from: "35-retrieval",
    to: "25-serving",
    why: "Hybrid search and reranking are what the serving path calls to fill a prompt.",
  },
  {
    from: "25-serving",
    to: "55-observability",
    why: "Every served request is the span tree observability records.",
  },
  {
    from: "25-serving",
    to: "45-evaluation",
    why: "Eval runs the same serving path production uses — otherwise it scores a different system.",
  },
  {
    from: "25-serving",
    to: "85-agents",
    why: "An agent's every step is a call to this retrieval and generation path.",
  },
  {
    from: "55-observability",
    to: "45-evaluation",
    why: "Real production misses, sampled from traces, are where the golden set grows from.",
  },
  {
    from: "55-observability",
    to: "75-finops",
    why: "The cost model is a join between this event log and the billing export.",
  },
  {
    from: "65-security",
    to: "25-serving",
    why: "Retrieval ACLs and output guardrails run inside the serving path, not beside it.",
  },
  {
    from: "65-security",
    to: "85-agents",
    why: "Least privilege and short-lived scoped tokens are what make a tool loop safe to run.",
  },
  {
    from: "75-finops",
    to: "25-serving",
    why: "Routing, caching and truncation are cost decisions serving is where you enforce.",
  },
  {
    from: "45-evaluation",
    to: "35-retrieval",
    why: "Recall is corpus-specific: the golden set is how you know your retrieval got better.",
  },
];

/** Modules whose output this module depends on. */
export function feedsFrom(moduleId: string): ModuleEdge[] {
  return MODULE_EDGES.filter((e) => e.to === moduleId);
}

/** Modules that depend on this module's output. */
export function readsInto(moduleId: string): ModuleEdge[] {
  return MODULE_EDGES.filter((e) => e.from === moduleId);
}

/** Title lookup for rendering an edge's other end. */
export function moduleTitle(moduleId: string): string {
  return MODULES.find((m) => m.id === moduleId)?.title ?? moduleId;
}

/** Curriculum order, for showing edges in a stable, teachable sequence. */
export function moduleOrder(moduleId: string): number {
  return MODULES.find((m) => m.id === moduleId)?.order ?? 0;
}
