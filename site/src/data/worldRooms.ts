/**
 * Which curriculum modules each room of `/world/` teaches.
 *
 * The flight is a story about a document becoming an answer; the curriculum is
 * how you learn to build that. This table is the join between them, so the
 * cinematic doubles as a table of contents instead of being decoration next to
 * one.
 *
 * The invariant — every module appears in exactly one room — is enforced by
 * `worldRooms.test.ts`. Adding a module to `modules.ts` without placing it here
 * fails that test rather than silently dropping it out of the world.
 */

import { MODULES } from "./modules";

export type RoomId = "01-sources" | "02-ingest" | "03-embed" | "04-index" | "05-reason" | "06-answer";

export const ROOM_MODULES: Record<RoomId, string[]> = {
  // Raw, unlabelled input of every shape — including the awkward ones.
  "01-sources": ["00-foundations", "38-multimodal"],
  // Landing it, then cutting it where the meaning breaks.
  "02-ingest": ["10-ingestion", "15-chunking"],
  "03-embed": ["20-embeddings"],
  "04-index": ["35-retrieval"],
  // The runtime that ranks, assembles, calls the model, and loops as an agent.
  "05-reason": ["25-serving", "85-agents"],
  // What makes an answer trustworthy rather than merely fluent.
  "06-answer": ["45-evaluation", "55-observability", "65-security", "75-finops"],
};

export type RoomModule = { id: string; title: string; order: number };

/** The modules for a room, in curriculum order, with their titles. */
export function roomModules(room: RoomId): RoomModule[] {
  const ids = new Set(ROOM_MODULES[room]);
  return MODULES.filter((m) => ids.has(m.id))
    .map((m) => ({ id: m.id, title: m.title, order: m.order }))
    .sort((a, b) => a.order - b.order);
}
