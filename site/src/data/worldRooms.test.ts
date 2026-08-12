import { describe, expect, it } from "vitest";
import { MODULES } from "./modules";
import { ROOM_MODULES, roomModules, type RoomId } from "./worldRooms";

const ROOM_IDS = Object.keys(ROOM_MODULES) as RoomId[];

describe("world room ↔ curriculum mapping", () => {
  it("places every module in exactly one room", () => {
    const placed = ROOM_IDS.flatMap((r) => ROOM_MODULES[r]);
    // A module added to modules.ts but not to a room would silently vanish
    // from the world's table of contents; a module in two rooms would be
    // taught twice. Both are drift, so both fail here.
    expect([...placed].sort()).toEqual([...MODULES.map((m) => m.id)].sort());
  });

  it("references no module that does not exist", () => {
    const known = new Set(MODULES.map((m) => m.id));
    for (const room of ROOM_IDS) {
      for (const id of ROOM_MODULES[room]) {
        expect(known.has(id), `${room} references unknown module ${id}`).toBe(true);
      }
    }
  });

  it("returns each room's modules in curriculum order, with titles", () => {
    const answer = roomModules("06-answer");
    expect(answer.map((m) => m.id)).toEqual([
      "45-evaluation",
      "55-observability",
      "65-security",
      "75-finops",
    ]);
    expect(answer[0].title).toBe("Evaluation");
  });

  it("covers all six rooms", () => {
    expect(ROOM_IDS).toHaveLength(6);
    for (const room of ROOM_IDS) expect(roomModules(room).length).toBeGreaterThan(0);
  });
});
