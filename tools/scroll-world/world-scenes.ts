/**
 * The world the camera flies through: six stations of a GenAI data platform,
 * grouped from the ten pipeline stages the site already publishes
 * (site/src/data/platformScroll.ts) so the film and the page tell the same story.
 *
 * Pure data + a seeded PRNG. Nothing here may read wall-clock time or
 * Math.random(): every frame of the render must be reproducible, because the
 * seam between two clips is "frame N and frame N+1 of one continuous render"
 * rather than two generations that happen to look alike.
 */

/**
 * The Modernist token set the site actually ships (site/src/styles/modernist.css):
 * paper ground, ink hairlines, one vermilion accent. The film has to be cut from
 * the same cloth as the page it lives on — a dark cyan sci-fi flight would read
 * as a widget someone bolted onto this site, whatever its production values.
 */
export const PALETTE = {
  bg: 0xf3f2f2, // --color-bg
  deep: 0xeae9e9, // --color-surface
  line: 0xbab6b6, // --color-neutral-400 · structure hairlines
  fog: 0x7d7979, // --color-neutral-600 · secondary objects
  ink: 0x201e1d, // --color-text · the subject of the frame
  accent: 0xec3013, // --color-accent
  accent2: 0xe15b47, // --color-accent-2
  // Three weights of emphasis rather than three hues: Modernist gets its
  // hierarchy from value and scale, not from a colour per stage.
  core: 0x605d5d,
  deepen: 0x201e1d,
  scale: 0xec3013,
} as const;

export type StationId =
  | "sources"
  | "ingest"
  | "embed"
  | "index"
  | "reason"
  | "answer";

export type Station = {
  id: StationId;
  /** Distance along -Z where this station's diorama sits. */
  z: number;
  /** Lateral drift of the flight path at this station — keeps the camera from
   *  running down a dead-straight corridor for 30 seconds. */
  cx: number;
  cy: number;
  /** How far BEYOND the arrival point the diorama sits. The camera reaches
   *  `z` exactly when this section's copy peaks, so a scene authored at `z`
   *  is already being flown through by the time anyone reads about it; nudged
   *  forward, it is framed at the peak and entered just after. The finale is
   *  the exception — it is authored to be arrived at, not passed. */
  focus: number;
  accent: number;
};

export const STATION_GAP = 62;

export const STATIONS: Station[] = [
  { id: "sources", z: 0, cx: 0, cy: 1.2, focus: 10, accent: PALETTE.accent },
  { id: "ingest", z: -STATION_GAP, cx: 6, cy: -1.5, focus: 18, accent: PALETTE.core },
  { id: "embed", z: -STATION_GAP * 2, cx: -5, cy: 2.2, focus: 20, accent: PALETTE.accent2 },
  { id: "index", z: -STATION_GAP * 3, cx: 4.5, cy: -2.4, focus: 24, accent: PALETTE.deepen },
  { id: "reason", z: -STATION_GAP * 4, cx: -4, cy: 1.6, focus: 24, accent: PALETTE.scale },
  { id: "answer", z: -STATION_GAP * 5, cx: 0, cy: 0, focus: 0, accent: PALETTE.accent },
];

/** Deterministic PRNG — same seed, same world, every render. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 0 → 1 ramp over [a, b], clamped, smoothstepped. */
export function ramp(x: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1)));
  return t * t * (3 - 2 * t);
}
