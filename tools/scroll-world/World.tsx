/**
 * The camera flight itself — one continuous take through six stations of a
 * GenAI data platform, rendered with plain three.js inside Remotion.
 *
 * Why raw three.js and not @react-three/fiber: the composer runs React 18 and
 * current R3F wants React 19, so the peer graph doesn't resolve. Nothing here
 * needs a reconciler anyway — the scene is built once and every frame is a
 * pure function of `frame`, which is also what makes the render reproducible.
 *
 * THE SEAM CONTRACT (why this beats a generated chain):
 *   - z(t) is strictly linear in time, so the camera never reverses. The
 *     lateral sway lives in x/y only.
 *   - The whole flight is ONE render. Clip boundaries are cut between adjacent
 *     frames of that render, so a seam isn't "two frames that look alike" —
 *     it is frame N and frame N+1 of the same continuous motion. There is
 *     nothing left for a crossfade to hide.
 */

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { PALETTE, STATIONS, mulberry32, ramp } from "./world-scenes";

const Z_START = 31;
const Z_END = -341;

/** Per-station local clock: -1 well before arrival, 0 at arrival, +1 after. */
function localTime(t: number, index: number): number {
  const arrival = (index + 0.5) / STATIONS.length;
  return (t - arrival) * STATIONS.length;
}

function lineMat(color: number, opacity: number) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity });
}

/**
 * A bump centred on station `i`'s arrival, zero everywhere near a seam.
 *
 * This is what lets the camera be expressive without breaking the chain. A leg
 * may orbit, crane or breathe its lens as much as it likes *in the middle*,
 * where there is no seam to break; the moment the flight approaches a cut the
 * bump has decayed to nothing, so both sides of the boundary are back on the
 * same plain forward glide. Seam safety stops being something to check for and
 * becomes a property of the function.
 */
function bump(t: number, index: number, width = 0.16): number {
  const centre = (index + 0.5) / STATIONS.length;
  const d = (t - centre) / width;
  return Math.exp(-d * d * 4);
}

/** Blueprint dimension line: |<——— span ———>| with tick serifs. */
function dimensionLine(
  from: THREE.Vector3,
  to: THREE.Vector3,
  color: number,
  opacity: number,
  tick = 0.6,
) {
  const pts: number[] = [];
  pts.push(from.x, from.y, from.z, to.x, to.y, to.z);
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar(tick);
  for (const p of [from, to]) {
    pts.push(p.x - perp.x, p.y - perp.y, p.z - perp.z, p.x + perp.x, p.y + perp.y, p.z + perp.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(geo, lineMat(color, opacity));
}

/** Registration marks — four corner brackets, the drafting frame of a plate. */
function cropMarks(w: number, h: number, arm: number, color: number, opacity: number) {
  const pts: number[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = (w / 2) * sx;
      const y = (h / 2) * sy;
      pts.push(x, y, 0, x - arm * sx, y, 0);
      pts.push(x, y, 0, x, y - arm * sy, 0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(geo, lineMat(color, opacity));
}

function edges(geo: THREE.BufferGeometry, color: number, opacity: number) {
  return new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat(color, opacity));
}

/** A sheet of "document": outline plus four ruled hairlines. */
function docPlane(w: number, h: number, color: number, opacity: number) {
  const g = new THREE.Group();
  g.add(edges(new THREE.PlaneGeometry(w, h), color, opacity));
  const pts: number[] = [];
  for (let i = 1; i <= 4; i++) {
    const y = h / 2 - (h / 5) * i;
    const half = (w / 2) * (i === 4 ? 0.45 : 0.78);
    pts.push(-half, y, 0, half, y, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(geo, lineMat(color, opacity * 0.55)));
  return g;
}

type Animated = { group: THREE.Group; tick: (u: number, t: number) => void };

/** 01 — SOURCES: raw knowledge, unstructured, orbiting the corridor. */
function buildSources(rand: () => number): Animated {
  const group = new THREE.Group();
  const docs: THREE.Group[] = [];
  for (let i = 0; i < 21; i++) {
    const a = (i / 21) * Math.PI * 2 * 3.1;
    // A helix rather than a ring: the camera starts outside it and threads
    // through, so documents pass on both sides instead of sitting off-frame.
    const r = 7.5 + (i % 5) * 3.1;
    const d = docPlane(3, 4.2, i % 5 === 0 ? PALETTE.accent : PALETTE.fog, 0.75);
    d.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.7, 26 - i * 2.5);
    d.rotation.set((rand() - 0.5) * 1.1, (rand() - 0.5) * 1.4, (rand() - 0.5) * 0.8);
    d.userData.spin = (rand() - 0.5) * 0.5;
    group.add(d);
    docs.push(d);
  }
  return {
    group,
    tick: (_u, t) => {
      group.rotation.z = t * 0.35;
      for (const d of docs) d.rotation.z += d.userData.spin * 0.004;
    },
  };
}

/** 02 — INGEST + PARSE/CHUNK: one document enters, leaves as chunks. */
function buildIngest(rand: () => number): Animated {
  const group = new THREE.Group();

  // The mill floor: a hairline grid the camera skims over.
  const floor: number[] = [];
  for (let i = -10; i <= 10; i++) {
    floor.push(i * 2.2, -7, -22, i * 2.2, -7, 22);
    floor.push(-22, -7, i * 2.2, 22, -7, i * 2.2);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(floor, 3));
  group.add(new THREE.LineSegments(fg, lineMat(PALETTE.line, 0.9)));

  // The blade: where layout-aware parsing cuts.
  const blade = edges(new THREE.PlaneGeometry(16, 11), PALETTE.accent, 0.9);
  blade.position.z = 2;
  group.add(blade);

  const incoming = docPlane(7, 9, PALETTE.ink, 0.85);
  incoming.position.z = 16;
  group.add(incoming);

  // The chunks it becomes.
  const chunks: THREE.LineSegments[] = [];
  for (let i = 0; i < 44; i++) {
    const c = edges(new THREE.PlaneGeometry(1.6, 1.1), PALETTE.core, 0.8);
    // The chunks fan outward past the camera rather than through it — a tile
    // that intersects the flight path just fills the frame with one rectangle.
    const a = (i / 44) * Math.PI * 2 * 2.2;
    const r = 7 + (i % 6) * 1.9;
    c.userData.home = new THREE.Vector3(
      Math.cos(a) * r,
      Math.sin(a) * r * 0.72,
      -4 - i * 0.55,
    );
    group.add(c);
    chunks.push(c);
  }

  return {
    group,
    tick: (u) => {
      const p = ramp(u, -0.85, 0.5);
      incoming.position.z = 16 - p * 13;
      incoming.visible = p < 0.99;
      chunks.forEach((c, i) => {
        const q = ramp(u, -0.7 + i * 0.006, 0.15 + i * 0.006);
        c.visible = q > 0.02;
        c.position.lerpVectors(new THREE.Vector3(0, 0, 3), c.userData.home, q);
        c.rotation.z = (1 - q) * 1.2;
        (c.material as THREE.LineBasicMaterial).opacity = 0.85 * q;
      });
    },
  };
}

/** 03 — EMBED: chunks collapse into a cloud of vectors. Meaning as geometry. */
function buildEmbed(rand: () => number): Animated {
  const group = new THREE.Group();
  const COUNT = 680;
  const from = new Float32Array(COUNT * 3);
  const to = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    // grid of chunks…
    const col = i % 26;
    const row = Math.floor(i / 26);
    from[i * 3] = (col - 12.5) * 1.15;
    from[i * 3 + 1] = (row - 10) * 1.15;
    from[i * 3 + 2] = 14;
    // …becomes a point on a sphere of meaning.
    const a = rand() * Math.PI * 2;
    const z = rand() * 2 - 1;
    const r = 9.5 * Math.cbrt(0.35 + rand() * 0.65);
    const s = Math.sqrt(1 - z * z);
    to[i * 3] = Math.cos(a) * s * r;
    to[i * 3 + 1] = Math.sin(a) * s * r * 0.9;
    to[i * 3 + 2] = z * r - 4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(from), 3));
  const points = new THREE.Points(
    geo,
    // Small, non-depth-writing: the camera flies THROUGH this cloud, and a
    // size-attenuated point a metre from the lens otherwise fills a tenth of
    // the frame with one blue square.
    new THREE.PointsMaterial({
      color: PALETTE.ink,
      size: 0.115,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    }),
  );
  group.add(points);

  // Three axes, so the cloud reads as a space and not confetti.
  const ax: number[] = [];
  const L = 13;
  ax.push(-L, 0, -4, L, 0, -4, 0, -L, -4, 0, L, -4, 0, 0, -4 - L, 0, 0, -4 + L);
  const ag = new THREE.BufferGeometry();
  ag.setAttribute("position", new THREE.Float32BufferAttribute(ax, 3));
  group.add(new THREE.LineSegments(ag, lineMat(PALETTE.line, 1)));

  // Neighbourhood: a handful of points close enough to be one meaning, joined
  // and bracketed. Without it the cloud is a texture; with it, it is an
  // argument about what "similar" means.
  const hood = new THREE.Group();
  const centre = new THREE.Vector3(3.4, 1.6, -6);
  const near: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    near.push(
      new THREE.Vector3(
        centre.x + Math.cos(a) * (1.5 + (i % 3) * 0.5),
        centre.y + Math.sin(a) * (1.3 + (i % 2) * 0.6),
        centre.z + Math.sin(a * 2) * 1.2,
      ),
    );
  }
  const hoodPts: number[] = [];
  for (const p of near) hoodPts.push(centre.x, centre.y, centre.z, p.x, p.y, p.z);
  const hg = new THREE.BufferGeometry();
  hg.setAttribute("position", new THREE.Float32BufferAttribute(hoodPts, 3));
  const hoodLines = new THREE.LineSegments(hg, lineMat(PALETTE.accent, 0.8));
  hood.add(hoodLines);
  const hoodMarks = cropMarks(7.5, 7, 1.1, PALETTE.accent, 0.8);
  hoodMarks.position.copy(centre);
  hood.add(hoodMarks);
  group.add(hood);

  return {
    group,
    tick: (u, t) => {
      const p = ramp(u, -0.9, 0.25);
      const pos = geo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < COUNT; i++) {
        const j = i * 3;
        const q = Math.min(1, Math.max(0, p * 1.35 - (i / COUNT) * 0.3));
        const e = q * q * (3 - 2 * q);
        pos.array[j] = from[j] + (to[j] - from[j]) * e;
        pos.array[j + 1] = from[j + 1] + (to[j + 1] - from[j + 1]) * e;
        pos.array[j + 2] = from[j + 2] + (to[j + 2] - from[j + 2]) * e;
      }
      pos.needsUpdate = true;
      group.rotation.y = Math.sin(t * 1.6) * 0.12;
      // The neighbourhood only resolves once the cloud has finished forming —
      // it is a claim about the space, so it can't precede the space.
      const h = ramp(u, -0.1, 0.35);
      hood.children.forEach((c) => {
        const m = (c as THREE.LineSegments).material as THREE.LineBasicMaterial;
        m.opacity = 0.8 * h;
      });
      hood.scale.setScalar(0.9 + h * 0.1);
    },
  };
}

/** 04 — VECTOR DB + RETRIEVE: a query enters the index, neighbours light up. */
function buildIndex(rand: () => number): Animated {
  const group = new THREE.Group();
  const N = 9;
  const pts: number[] = [];
  const cells: THREE.Vector3[] = [];
  for (let x = 0; x < N; x++)
    for (let y = 0; y < N; y++)
      for (let z = 0; z < N; z++) {
        const v = new THREE.Vector3(
          (x - (N - 1) / 2) * 2.6 + (rand() - 0.5) * 0.5,
          (y - (N - 1) / 2) * 2.6 + (rand() - 0.5) * 0.5,
          (z - (N - 1) / 2) * 2.6 + (rand() - 0.5) * 0.5,
        );
        cells.push(v);
        pts.push(v.x, v.y, v.z);
      }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  group.add(
    new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: PALETTE.fog,
        size: 0.17,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    ),
  );
  group.add(edges(new THREE.BoxGeometry(25, 25, 25), PALETTE.deepen, 0.7));
  // Dimensioned like a drawing, not a prop: the index is a measured volume.
  group.add(
    dimensionLine(
      new THREE.Vector3(-12.5, -14.5, 12.5),
      new THREE.Vector3(12.5, -14.5, 12.5),
      PALETTE.fog,
      0.7,
      0.9,
    ),
  );
  group.add(
    dimensionLine(
      new THREE.Vector3(-14.5, -12.5, 12.5),
      new THREE.Vector3(-14.5, 12.5, 12.5),
      PALETTE.fog,
      0.7,
      0.9,
    ),
  );
  const frameMarks = cropMarks(29, 29, 2.4, PALETTE.accent, 0.55);
  frameMarks.position.z = 12.5;
  group.add(frameMarks);

  // The query ray, and the k it finds.
  const rayGeo = new THREE.BufferGeometry();
  rayGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 20, 0, 0, -20], 3));
  const ray = new THREE.Line(rayGeo, lineMat(PALETTE.accent, 0.95));
  group.add(ray);

  // Neighbours are picked from the far half of the index only: a "hit" beside
  // the lens is a cyan blob covering a quarter of the frame, not a result.
  const far = cells.filter((c) => c.z < -3 && c.length() < 11);
  const hits: THREE.Object3D[] = [];
  for (let i = 0; i < 7; i++) {
    const target = far[Math.floor(rand() * far.length)];
    // Brackets, not blobs: a solid sphere passing near the lens is a red disc
    // over a quarter of the frame, and a filled primitive is the one shape
    // this whole drawing doesn't otherwise contain.
    const m = cropMarks(1.6, 1.6, 0.5, PALETTE.accent, 0.95);
    m.position.copy(target);
    group.add(m);
    hits.push(m);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, target.x, target.y, target.z], 3),
    );
    const l = new THREE.Line(lg, lineMat(PALETTE.accent, 0.5));
    l.userData.reveal = 0.1 + i * 0.05;
    group.add(l);
  }

  return {
    group,
    tick: (u, t) => {
      const p = ramp(u, -0.6, 0.2);
      ray.scale.z = 0.15 + p * 0.85;
      group.children.forEach((c) => {
        if (c instanceof THREE.Line && c.userData.reveal != null) {
          (c.material as THREE.LineBasicMaterial).opacity = 0.5 * ramp(u, -0.35 + c.userData.reveal, 0.25);
        }
      });
      hits.forEach((m, i) => {
        const s = 0.4 + 0.9 * ramp(u, -0.4 + i * 0.03, 0.15) * (1 + 0.12 * Math.sin(t * 6 + i));
        m.scale.setScalar(s);
      });
      group.rotation.y = t * 0.18;
    },
  };
}

/** 05 — RERANK + ASSEMBLE + LLM: ranked evidence, assembled, reasoned over. */
function buildReason(): Animated {
  const group = new THREE.Group();

  const bars: THREE.LineSegments[] = [];
  for (let i = 0; i < 9; i++) {
    const w = 12 - i * 1.05;
    const b = edges(
      new THREE.PlaneGeometry(w, 0.9),
      i < 3 ? PALETTE.scale : PALETTE.fog,
      i < 3 ? 0.95 : 0.5,
    );
    b.position.set(0, 5.6 - i * 1.35, 30);
    group.add(b);
    bars.push(b);
  }

  // The model: a ring the camera flies through.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(9, 0.16, 8, 90),
    new THREE.MeshBasicMaterial({ color: PALETTE.scale, transparent: true, opacity: 0.85 }),
  );
  ring.position.z = -4;
  group.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(12.5, 0.08, 8, 90),
    new THREE.MeshBasicMaterial({ color: PALETTE.line, transparent: true, opacity: 0.9 }),
  );
  ring2.position.z = -16;
  group.add(ring2);

  // The agent loop: plan → tool call → observe, orbiting the model.
  const orbit = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const c = edges(new THREE.BoxGeometry(1.8, 1.8, 1.8), PALETTE.accent, 0.9);
    const a = (i / 3) * Math.PI * 2;
    c.position.set(Math.cos(a) * 6.5, Math.sin(a) * 6.5, -16);
    orbit.add(c);
  }
  group.add(orbit);

  return {
    group,
    tick: (u, t) => {
      bars.forEach((b, i) => {
        const q = ramp(u, -0.8 + i * 0.04, -0.1 + i * 0.04);
        b.position.z = 30 - q * 16;
        (b.material as THREE.LineBasicMaterial).opacity = (i < 3 ? 0.95 : 0.5) * q;
      });
      ring.rotation.z = t * 0.6;
      orbit.rotation.z = -t * 0.9;
    },
  };
}

/** 06 — GROUNDED ANSWER: cited, governed, and where the flight lands. */
function buildAnswer(): Animated {
  const group = new THREE.Group();

  // The flight ends 31 units past this station's origin, so the finale is
  // authored ahead of it: the camera arrives in front of the answer instead of
  // flying through it.
  const panel = docPlane(20, 12, PALETTE.ink, 0.95);
  panel.position.z = -60;
  group.add(panel);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(9, 0.1, 8, 120),
    new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.6 }),
  );
  halo.position.z = -55;
  group.add(halo);

  // The last frame of the film is a plate: the answer, measured and registered.
  const plate = cropMarks(26, 17, 2.6, PALETTE.accent, 0.8);
  plate.position.z = -59;
  group.add(plate);
  const measure = dimensionLine(
    new THREE.Vector3(-10, -8, -59),
    new THREE.Vector3(10, -8, -59),
    PALETTE.fog,
    0.75,
    0.7,
  );
  group.add(measure);

  // Citations: hairlines running back from the answer to the sources it used.
  const cites: THREE.Line[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const src = new THREE.Vector3(Math.cos(a) * 17, Math.sin(a) * 11, -8);
    const d = docPlane(2.4, 3.2, PALETTE.fog, 0.7);
    d.position.copy(src);
    d.lookAt(0, 0, -60);
    group.add(d);
    // Citations land on the answer's edge, not its centre — five lines meeting
    // at one point in the middle of the panel just draws an X over the copy.
    const lg = new THREE.BufferGeometry();
    lg.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [src.x, src.y, src.z, Math.cos(a) * 9.4, Math.sin(a) * 5.6, -59.6],
        3,
      ),
    );
    const l = new THREE.Line(lg, lineMat(PALETTE.accent, 0.55));
    l.userData.i = i;
    group.add(l);
    cites.push(l);
  }

  // Policy gates the answer had to clear.
  const gates: THREE.LineSegments[] = [];
  for (let i = 0; i < 4; i++) {
    const gate = edges(new THREE.PlaneGeometry(26 - i * 4, 17 - i * 2.6), PALETTE.line, 0.9);
    gate.position.z = -i * 10;
    group.add(gate);
    gates.push(gate);
  }

  return {
    group,
    tick: (u, t) => {
      const p = ramp(u, -1.2, -0.1);
      panel.scale.setScalar(0.86 + p * 0.14);
      halo.rotation.z = t * 0.4;
      cites.forEach((l) => {
        (l.material as THREE.LineBasicMaterial).opacity =
          0.55 * ramp(u, -0.9 + l.userData.i * 0.07, -0.2 + l.userData.i * 0.07);
      });
      gates.forEach((g, i) => {
        (g.material as THREE.LineBasicMaterial).opacity = 0.9 * (0.5 + 0.5 * Math.sin(t * 2 + i));
      });
    },
  };
}

const BUILDERS = [buildSources, buildIngest, buildEmbed, buildIndex, buildReason, buildAnswer];

function buildWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.bg);
  scene.fog = new THREE.Fog(PALETTE.bg, 30, 190);

  const animated: Animated[] = [];
  STATIONS.forEach((st, i) => {
    const rand = mulberry32(1337 + i * 977);
    const build = BUILDERS[i] as (r: () => number) => Animated;
    const a = build(rand);
    a.group.position.set(st.cx * 0.4, st.cy * 0.4, st.z - st.focus);
    scene.add(a.group);
    animated.push(a);
  });

  // The corridor. Without it the stations are islands in black and the camera
  // reads as static between them; with it every metre of the flight has
  // hairline structure sliding past, which is what sells the speed.
  const floor: number[] = [];
  for (let x = -7; x <= 7; x++) floor.push(x * 4, -13, Z_START + 10, x * 4, -13, Z_END - 40);
  for (let z = Z_START + 10; z > Z_END - 40; z -= 4) floor.push(-28, -13, z, 28, -13, z);
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(floor, 3));
  scene.add(new THREE.LineSegments(fg, lineMat(PALETTE.line, 0.85)));

  // A ruler down both walls. Ticks passing the lens at a known spacing are the
  // cheapest, most legible speed cue there is — the eye reads velocity off
  // regular marks far better than off an open grid.
  const ticks: number[] = [];
  let ti = 0;
  for (let z = Z_START + 10; z > Z_END - 40; z -= 2, ti++) {
    const long = ti % 5 === 0;
    const len = long ? 2.4 : 1.1;
    for (const sx of [-1, 1]) {
      ticks.push(sx * 26, -13, z, sx * 26, -13 + len, z);
    }
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute("position", new THREE.Float32BufferAttribute(ticks, 3));
  scene.add(new THREE.LineSegments(tg, lineMat(PALETTE.fog, 0.55)));

  // Gates: a rectangle every few metres, breathing in size. Flying through
  // them is most of the perceived motion. Every sixth carries the accent and a
  // set of registration marks, so the corridor has a beat rather than a texture.
  const gates = new THREE.Group();
  let gi = 0;
  for (let z = Z_START + 8; z > Z_END - 30; z -= 7, gi++) {
    const s = 1 + Math.sin(gi * 0.42) * 0.18;
    const marked = gi % 6 === 0;
    const w = 34 * s;
    const h = 21 * s;
    const g = edges(new THREE.PlaneGeometry(w, h), marked ? PALETTE.accent : PALETTE.line, marked ? 0.5 : 0.8);
    const x = Math.sin(gi * 0.31) * 1.4;
    const y = -1.5 + Math.cos(gi * 0.27) * 0.8;
    g.position.set(x, y, z);
    gates.add(g);
    if (marked) {
      const marks = cropMarks(w + 3, h + 3, 1.6, PALETTE.accent, 0.45);
      marks.position.set(x, y, z);
      gates.add(marks);
    }
  }
  scene.add(gates);

  // Foreground rules: a few hairlines strung close to the flight path. They
  // whip past the lens between rooms, and near-field parallax is what makes a
  // slow camera feel fast.
  const near = new THREE.Group();
  const nrand = mulberry32(52711);
  for (let i = 0; i < 11; i++) {
    const z = Z_START - 10 - i * ((Z_START - Z_END) / 11);
    const a = nrand() * Math.PI * 2;
    const r = 4.5 + nrand() * 3;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [Math.cos(a) * r, Math.sin(a) * r, z, Math.cos(a) * (r + 9), Math.sin(a) * (r + 9), z - 3],
        3,
      ),
    );
    near.add(new THREE.Line(geo, lineMat(i % 5 === 0 ? PALETTE.accent : PALETTE.fog, 0.5)));
  }
  scene.add(near);

  return { scene, animated };
}

/** Lateral sway: interpolated station offsets, with z left strictly linear. */
function swayCurve() {
  const pts = STATIONS.map((s, i) => new THREE.Vector3(s.cx, s.cy, i / (STATIONS.length - 1)));
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
}

export const World: React.FC<{ portrait?: boolean }> = ({ portrait = false }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const world = useMemo(() => buildWorld(), []);
  const sway = useMemo(() => swayCurve(), []);
  const camera = useMemo(
    () => new THREE.PerspectiveCamera(portrait ? 62 : 50, width / height, 0.1, 400),
    [width, height, portrait],
  );

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!rendererRef.current) {
      rendererRef.current = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        // Remotion screenshots the canvas after the frame is drawn, so the
        // drawing buffer must survive the swap.
        preserveDrawingBuffer: true,
      });
      rendererRef.current.setPixelRatio(1);
      rendererRef.current.setSize(width, height, false);
    }
    const renderer = rendererRef.current;

    const t = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;
    const seconds = frame / fps;

    world.animated.forEach((a, i) => a.tick(localTime(t, i), seconds));

    const z = Z_START + (Z_END - Z_START) * t;
    const s = sway.getPoint(Math.min(1, Math.max(0, t)));
    const ahead = sway.getPoint(Math.min(1, t + 0.05));
    const zAhead = Z_START + (Z_END - Z_START) * Math.min(1, t + 0.05);

    // Camera grammar. Each room gets a move chosen from what happens in it,
    // and every move is carried on a `bump()` that has decayed to zero by the
    // time the flight reaches a cut — expressive in the middle of a leg, plain
    // forward glide at both seams. z is untouched: the camera never reverses.
    const drift = bump(t, 0) * 1.1; // sources — settle into the helix
    const track = bump(t, 1) * 3.4; // ingest — lateral track along the mill
    const swell = bump(t, 2); // embed — lens opens into the cloud
    const crane = bump(t, 3) * 2.6; // index — rise over the lattice, then drop
    const orbit = bump(t, 4); // reason — swing around the model ring
    const settle = bump(t, 5); // answer — square up and hold

    camera.position.set(
      s.x + track * Math.sin(t * 22) * 0.35 + orbit * 2.4 * Math.sin(t * 15),
      s.y + crane * Math.sin((t - 0.5833) * 26) + drift * 0.4,
      z,
    );
    // Bank into the moves rather than staying gyro-level: a level horizon under
    // a lateral move reads as a slide, a banked one reads as flight.
    camera.up.set(
      Math.sin(t * Math.PI * 2.2) * 0.05 - track * 0.05 - orbit * 0.08 * Math.sin(t * 15),
      1,
      0,
    );
    camera.lookAt(
      ahead.x * 0.55 + orbit * 1.6 * Math.sin(t * 15 + 1.2),
      ahead.y * 0.55 - crane * 0.35,
      zAhead - 6 - settle * 4,
    );
    // A little lens breathing: wider through the open rooms, tighter as the
    // flight arrives on the answer. Also returns to base at every seam.
    const baseFov = portrait ? 62 : 50;
    camera.fov = baseFov + swell * 5 - settle * 4;
    camera.updateProjectionMatrix();

    renderer.render(world.scene, camera);
  }, [frame, width, height, durationInFrames, fps, world, sway, camera]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ width, height }} />;
};
