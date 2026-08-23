/**
 * The hero's first paint, rendered offline at a quality the live canvas cannot
 * afford on load.
 *
 * The homepage hero is a live WebGL scene that re-tints on the cloud switch and
 * has ten pipeline labels tracking node positions in 3D — a film cannot replace
 * that, and this does not try to. What it replaces is the EMPTY DIV a visitor
 * looks at before hydration: the canvas paints nothing until the scene mounts,
 * which on a cold load is the first thing anyone sees.
 *
 * DIVISION OF LABOUR: this film is the ROOM — a dense ruled floor, fog, drifting
 * motes, the arc a request travels, dimension lines. The live canvas keeps the
 * ten pipeline nodes and draws them over it (its renderer is alpha:true, so the
 * film shows through). Neither duplicates the other: the film supplies depth and
 * atmosphere a browser should not be asked to rasterise every frame, the canvas
 * supplies everything that has to react to the visitor.
 *
 * SEAMLESS BY CONSTRUCTION: every animated quantity is periodic over the
 * composition's exact duration, so frame N-1 hands back to frame 0 with no cut.
 * There is no crossfade hiding a seam because there is no seam.
 *
 * Neutral ink only — no accent is baked in. The accent belongs to the cloud the
 * visitor picks, and that lives in the DOM above this.
 */

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";

const GROUND = "#f3f2f2";
const INK = 0x201e1d;
const LINE = 0xbab6b6;
const FOG = 0x7d7979;

const NODES = 10;
const GAP = 4.4;

/** Deterministic — the same film every render, which is what makes it cacheable. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lineMat(color: number, opacity: number) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity });
}

function edges(geo: THREE.BufferGeometry, color: number, opacity: number) {
  return new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat(color, opacity));
}

/** Corner brackets — the drafting mark the rest of the site uses. */
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

type Built = {
  scene: THREE.Scene;
  nodes: THREE.Group[];
  motes: THREE.Points;
  moteSeeds: number[];
  ribbon: THREE.Line;
};

function build(): Built {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(GROUND);
  scene.fog = new THREE.Fog(new THREE.Color(GROUND).getHex(), 34, 145);

  const rand = mulberry32(90210);
  const root = new THREE.Group();
  scene.add(root);

  // The floor: a ruled plane, denser than the live scene's GridHelper because
  // this only has to be rasterised once.
  const floor: number[] = [];
  for (let i = -30; i <= 30; i++) {
    floor.push(i * 2.2, -7, -70, i * 2.2, -7, 70);
    floor.push(-66, -7, i * 2.4, 66, -7, i * 2.4);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(floor, 3));
  root.add(new THREE.LineSegments(fg, lineMat(LINE, 0.75)));

  const nodes: THREE.Group[] = [];

  // The spine itself, plus a dimension line under it.
  const half = ((NODES - 1) / 2) * GAP;
  const spineGeo = new THREE.BufferGeometry();
  spineGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-half, 0, 0, half, 0, 0], 3),
  );
  root.add(new THREE.Line(spineGeo, lineMat(INK, 0.7)));

  const dim: number[] = [-half, -4.4, 0, half, -4.4, 0];
  for (const x of [-half, half]) dim.push(x, -5.1, 0, x, -3.7, 0);
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.Float32BufferAttribute(dim, 3));
  root.add(new THREE.LineSegments(dg, lineMat(FOG, 0.5)));

  // A ribbon arcing over the spine: the path a request takes.
  const curve = new THREE.CatmullRomCurve3(
    Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      return new THREE.Vector3(-half + t * half * 2, Math.sin(t * Math.PI) * 5.2, Math.sin(t * Math.PI * 2) * 2.4);
    }),
  );
  const ribbon = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(curve.getPoints(220)),
    lineMat(FOG, 0.8),
  );
  root.add(ribbon);

  // Motes drifting through the volume — density is free at build time.
  const COUNT = 900;
  const pos = new Float32Array(COUNT * 3);
  const moteSeeds: number[] = [];
  for (let i = 0; i < COUNT; i++) {
    moteSeeds.push(rand());
    pos[i * 3] = (rand() - 0.5) * half * 2.6;
    pos[i * 3 + 1] = (rand() - 0.5) * 16;
    pos[i * 3 + 2] = (rand() - 0.5) * 40;
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(
    mg,
    new THREE.PointsMaterial({ color: FOG, size: 0.1, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  root.add(motes);

  // Faint bracket frames where the live nodes will sit: they register the two
  // layers to each other without drawing the nodes themselves.
  for (let i = 0; i < NODES; i++) {
    const marks = cropMarks(4.2, 4.2, 0.9, LINE, 0.5);
    marks.position.set((i - (NODES - 1) / 2) * GAP, 0, -0.9);
    root.add(marks);
  }

  return { scene, nodes, motes, moteSeeds, ribbon };
}

export const HeroFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const built = useMemo(() => build(), []);
  const camera = useMemo(
    () => new THREE.PerspectiveCamera(42, width / height, 0.1, 220),
    [width, height],
  );

  useEffect(() => () => {
    rendererRef.current?.dispose();
    rendererRef.current = null;
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!rendererRef.current) {
      rendererRef.current = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      rendererRef.current.setPixelRatio(1);
      rendererRef.current.setSize(width, height, false);
    }
    const renderer = rendererRef.current;

    // ONE full turn of every cycle across the composition: at u = 1 every
    // expression below returns to its value at u = 0, so the loop is seamless
    // without a crossfade.
    const u = frame / durationInFrames;
    const TAU = Math.PI * 2;

    const { motes, moteSeeds, ribbon } = built;
    const half = ((NODES - 1) / 2) * GAP;

    (ribbon.material as THREE.LineBasicMaterial).opacity = 0.45 + 0.3 * Math.sin(TAU * u);

    // Motes drift one full field-width and wrap — periodic, so seamless.
    const mp = motes.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < moteSeeds.length; i++) {
      const span = half * 2.6;
      const start = (moteSeeds[i] - 0.5) * span;
      mp.array[i * 3] = ((start + u * span + span * 1.5) % span) - span / 2;
      mp.array[i * 3 + 1] =
        (moteSeeds[i] - 0.5) * 16 + Math.sin(TAU * u + moteSeeds[i] * TAU) * 0.6;
    }
    mp.needsUpdate = true;

    // Camera: one gentle orbit, returning exactly to where it started.
    const orbit = TAU * u;
    camera.position.set(Math.sin(orbit) * 3.2, 6.4 + Math.sin(orbit) * 0.5, 34 + Math.cos(orbit) * 1.6);
    camera.lookAt(0, 0.4, 0);
    camera.updateProjectionMatrix();

    renderer.render(built.scene, camera);
  }, [frame, width, height, durationInFrames, built, camera]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ width, height }} />;
};
