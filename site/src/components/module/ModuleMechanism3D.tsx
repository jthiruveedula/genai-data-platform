/**
 * The module's own mechanism, in three dimensions.
 *
 * Every module page already ships a static strip of its 4-5 mechanism steps
 * (ModuleFlowDiagram + data/moduleFlows.ts). This is that same data, laid out
 * in space and running: a payload travels the mechanism, the station it is at
 * lights up, and the arrangement itself carries the argument — sources fan in,
 * a document splits, two searches fuse, an agent loops.
 *
 * Deliberately NOT a second source of truth. Labels, details, step order and
 * shape all come from `MODULE_FLOWS`, so the 3D view can never drift from the
 * strip it hydrates over, and no module needs bespoke scene code.
 *
 * Rendering conventions follow /world/: ink hairlines on paper, drafting
 * brackets rather than filled primitives, the page's own accent (which
 * follows the cloud switch — see `useThemeInk`).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";

export type MechanismStep = { label: string; detail: string };
export type MechanismShape = "line" | "fan-in" | "split" | "fork" | "fuse" | "stack" | "loop";

type Node = {
  /** Index into `steps`, or -1 for a satellite (a source, a chunk, a span). */
  step: number;
  pos: [number, number, number];
  /** Satellites are drawn small and unlabelled — they are the material the
   *  mechanism acts on, not stations in it. */
  satellite?: boolean;
};

type Layout = {
  nodes: Node[];
  /** Index pairs into `nodes`. */
  edges: [number, number][];
  /** The path the payload travels, as node indices. */
  path: number[];
};

const SPAN = 10.5;

/**
 * Positions for each shape. All of them lay the spine out left-to-right so the
 * 3D view reads in the same direction as the strip underneath it; the shape
 * shows up in what surrounds the spine.
 */
function layoutFor(shape: MechanismShape, count: number, mergeAt?: number): Layout {
  const spineX = (i: number) => -SPAN / 2 + (SPAN / Math.max(1, count - 1)) * i;
  const spine: Node[] = Array.from({ length: count }, (_, i) => ({
    step: i,
    // Alternating depth, strongest in the middle of the run: the mechanism
    // reads as an object in space rather than a flat plate, and perspective
    // does the work of showing which station is where.
    pos: [spineX(i), 0, Math.sin((i / Math.max(1, count - 1)) * Math.PI) * (i % 2 ? -1.1 : 1.1)] as [
      number,
      number,
      number,
    ],
  }));
  const edges: [number, number][] = [];
  for (let i = 0; i < count - 1; i++) edges.push([i, i + 1]);
  const nodes = [...spine];
  const path = spine.map((_, i) => i);

  const push = (pos: [number, number, number]) => {
    nodes.push({ step: -1, pos, satellite: true });
    return nodes.length - 1;
  };

  switch (shape) {
    case "fan-in": {
      // Several kinds of input arriving on the first station.
      for (let k = 0; k < 5; k++) {
        const y = (k - 2) * 1.15;
        const idx = push([spineX(0) - 3.2, y, (k % 2 ? 1 : -1) * 0.5]);
        edges.push([idx, 0]);
      }
      break;
    }
    case "split": {
      // One document becoming many chunks, off the splitter station.
      const from = Math.min(1, count - 1);
      for (let k = 0; k < 8; k++) {
        const idx = push([
          spineX(from) + 1.1 + (k % 4) * 0.45,
          (Math.floor(k / 4) - 0.5) * 2.6 + ((k % 4) - 1.5) * 0.5,
          ((k % 3) - 1) * 0.7,
        ]);
        edges.push([from, idx]);
      }
      break;
    }
    case "fork": {
      // The branch taken only on a decision — escalation, or a blocked deploy.
      const from = Math.max(0, count - 2);
      const idx = push([spineX(from) + 1.6, 2.3, 0.4]);
      edges.push([from, idx]);
      edges.push([idx, count - 1]);
      break;
    }
    case "fuse": {
      // Two paths run in parallel into the merge station and are joined there.
      // The spine stays straight — only the leg into the merge is doubled, via
      // a pair of way-points above and below it. Which station merges is data
      // (`mergeAt`), because no rule over the labels gets both Module 35 (RRF
      // fusing dense and sparse) and Module 75 (the event log joined against
      // billing) right.
      const merge = Math.min(Math.max(1, mergeAt ?? 2), count - 1);
      const prev = merge - 1;
      const midX = (spineX(prev) + spineX(merge)) / 2;
      const up = push([midX, 1.7, 0]);
      const down = push([midX, -1.7, 0]);
      // Drop the straight leg that the two lanes replace.
      const straight = edges.findIndex(([a, b]) => a === prev && b === merge);
      if (straight >= 0) edges.splice(straight, 1);
      edges.push([prev, up], [up, merge], [prev, down], [down, merge]);
      // The payload takes the upper lane and the lower one alternately, which
      // is the closest a single token gets to saying "both, at once".
      path.splice(merge, 0, up);
      break;
    }
    case "stack": {
      // Layers recorded against the spine: spans under a trace, gates under a
      // request. Each layer sits below its own station.
      for (let i = 1; i < count; i++) {
        const idx = push([spineX(i), -2.1, 0]);
        edges.push([i, idx]);
        if (i > 1) edges.push([idx - 1, idx]);
      }
      break;
    }
    case "loop": {
      // The return leg, drawn as a drafted rectangle under the spine rather
      // than a dip: the observation goes down, back, and up into the decision
      // it feeds. The payload runs one full iteration before taking the exit,
      // which is what a bounded loop looks like.
      const back = Math.max(1, count - 2);
      const down = push([spineX(back), -2.7, 0]);
      const under = push([spineX(1), -2.7, 0]);
      edges.push([back, down], [down, under], [under, 1]);
      const exit = path.pop()!; // the last station is the way out of the loop
      path.push(down, under, ...path.slice(1, back + 1), exit);
      break;
    }
    case "line":
    default:
      break;
  }

  return { nodes, edges, path };
}

/** Drafting bracket — four corners, no fill. The station marker. */
function Bracket({
  size,
  color,
  opacity,
}: {
  size: number;
  color: string;
  opacity: number;
}) {
  const points = useMemo(() => {
    const h = size / 2;
    const arm = size * 0.36;
    const segs: [number, number, number][][] = [];
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        segs.push([
          [h * sx - arm * sx, h * sy, 0],
          [h * sx, h * sy, 0],
          [h * sx, h * sy - arm * sy, 0],
        ]);
      }
    }
    return segs;
  }, [size]);

  return (
    <>
      {points.map((seg, i) => (
        <Line key={i} points={seg} color={color} lineWidth={1.6} transparent opacity={opacity} />
      ))}
    </>
  );
}

/** Reads the page's own tokens so the mechanism is drawn in the site's ink and
 *  the active cloud's accent — and re-reads them when the cloud switches. */
function useThemeInk() {
  const [ink, setInk] = useState({ line: "#bab6b6", text: "#201e1d", accent: "#ec3013" });

  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const pick = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
      setInk({
        line: pick("--border", "#bab6b6"),
        text: pick("--text", "#201e1d"),
        accent: pick("--accent", "#ec3013"),
      });
    };
    read();
    // The navbar's cloud switch only flips attributes on <html>; there is no
    // event to listen for, so observe the attribute the tokens hang off.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-cloud", "data-pf-cloud", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return ink;
}

const DWELL = 1.15; // seconds a payload rests at a station
const TRAVEL = 0.62; // seconds between stations

function Mechanism({
  steps,
  shape,
  mergeAt,
  focus,
  onFocus,
}: {
  steps: MechanismStep[];
  shape: MechanismShape;
  mergeAt?: number;
  focus: number | null;
  onFocus: (i: number | null) => void;
}) {
  const ink = useThemeInk();
  const { nodes, edges, path } = useMemo(
    () => layoutFor(shape, steps.length, mergeAt),
    [shape, steps.length, mergeAt],
  );
  const payload = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const [active, setActive] = useState(0);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0.35, 9.8);
    camera.lookAt(0, -0.15, 0);
  }, [camera]);

  useFrame(({ clock, pointer }) => {
    // The whole mechanism turns a few degrees toward the pointer, over a slow
    // idle drift so it is never quite static. Rotation only — nothing moves in
    // depth, so no station can swap places with another while you read it.
    const stage = rig.current;
    if (stage) {
      const t = clock.getElapsedTime();
      const targetY = pointer.x * 0.22 + Math.sin(t * 0.24) * 0.05;
      const targetX = -pointer.y * 0.12 + Math.sin(t * 0.19) * 0.03;
      stage.rotation.y += (targetY - stage.rotation.y) * 0.05;
      stage.rotation.x += (targetX - stage.rotation.x) * 0.05;
    }

    const group = payload.current;
    if (!group) return;

    // Hovering a station takes the payload there and holds it: the visitor is
    // reading that step, so the animation stops arguing with them.
    if (focus != null) {
      const at = nodes[path[Math.min(focus, path.length - 1)]];
      group.position.lerp(new THREE.Vector3(...at.pos), 0.18);
      if (active !== focus) setActive(focus);
      return;
    }

    const cycle = DWELL + TRAVEL;
    const total = path.length * cycle;
    const t = (clock.getElapsedTime() % total) / cycle;
    const i = Math.floor(t);
    const frac = t - i;
    const from = nodes[path[i]];
    const to = nodes[path[(i + 1) % path.length]];
    // Rest, then move: a payload that glides continuously reads as decoration,
    // one that stops at each station reads as a mechanism doing work.
    const travelled = frac <= DWELL / cycle ? 0 : (frac - DWELL / cycle) / (TRAVEL / cycle);
    const eased = travelled * travelled * (3 - 2 * travelled);
    group.position.lerpVectors(
      new THREE.Vector3(...from.pos),
      new THREE.Vector3(...to.pos),
      eased,
    );
    const stepAt = nodes[path[i]].step;
    if (stepAt >= 0 && active !== stepAt) setActive(stepAt);
  });

  return (
    <group ref={rig}>
      {edges.map(([a, b], i) => (
        <Line
          key={`e${i}`}
          points={[nodes[a].pos, nodes[b].pos]}
          color={ink.line}
          lineWidth={1.2}
          transparent
          opacity={0.95}
        />
      ))}

      {nodes.map((node, i) =>
        node.satellite ? (
          <group key={`s${i}`} position={node.pos}>
            <Bracket size={0.5} color={ink.line} opacity={0.9} />
          </group>
        ) : (
          <group
            key={`n${i}`}
            position={node.pos}
            onPointerOver={(e) => {
              e.stopPropagation();
              onFocus(node.step);
            }}
            onPointerOut={() => onFocus(null)}
          >
            {/* An invisible hit area: brackets are hairlines, and hairlines are
                almost impossible to point at. */}
            <mesh visible={false}>
              <planeGeometry args={[1.9, 1.9]} />
            </mesh>
            <Bracket
              size={active === node.step ? 1.55 : 1.25}
              color={active === node.step ? ink.accent : ink.text}
              opacity={active === node.step ? 1 : 0.55}
            />
            <Html center distanceFactor={11} position={[0, node.step % 2 ? 1.5 : -1.5, 0]}>
              <div className={`mech-label${active === node.step ? " is-active" : ""}`}>
                <span className="mech-label__index">{String(node.step + 1).padStart(2, "0")}</span>
                <span className="mech-label__text">{steps[node.step]?.label}</span>
              </div>
            </Html>
          </group>
        ),
      )}

      <group ref={payload}>
        <mesh>
          <sphereGeometry args={[0.17, 16, 16]} />
          <meshBasicMaterial color={ink.accent} />
        </mesh>
      </group>
    </group>
  );
}

export default function ModuleMechanism3D({
  steps,
  shape,
  mergeAt,
}: {
  steps: MechanismStep[];
  shape: MechanismShape;
  mergeAt?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);

  // Same gate as VectorSpaceScene3D / CurriculumFlight3D: `ready` must start
  // false and only flip inside an effect, so SSR and the first client render
  // agree, and reduced-motion visitors keep the static diagram.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setReady(true);
    const wrapper = rootRef.current?.closest<HTMLElement>("[data-module-mechanism]");
    wrapper?.setAttribute("data-mode", "3d");
    return () => wrapper?.removeAttribute("data-mode");
  }, []);

  const detail = focus != null ? steps[focus] : null;

  return (
    <div className="mech-root" ref={rootRef}>
      {ready && (
        <>
          <Canvas camera={{ position: [0, 0.35, 9.8], fov: 44 }} dpr={[1, 1.5]}>
            <Mechanism steps={steps} shape={shape} mergeAt={mergeAt} focus={focus} onFocus={setFocus} />
          </Canvas>
          {/* The hovered step's detail, in HTML rather than in the scene: it is
              prose, and prose belongs in the document. */}
          <p className="mech-detail" aria-live="polite">
            {detail ? (
              <>
                <strong>{detail.label}</strong> — {detail.detail}
              </>
            ) : (
              <span className="mech-detail__hint">Point at a station to read its step.</span>
            )}
          </p>
        </>
      )}
    </div>
  );
}
