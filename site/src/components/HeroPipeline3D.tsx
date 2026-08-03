import { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";

// Full-page 3D hero background (redesign: "3D animation should cover whole
// page, far better than this"). Same ready-gate / reduced-motion pattern as
// AgentConstellation3D.tsx and VectorSpaceScene3D.tsx: a static 2D SVG stays
// in the markup as the no-JS/reduced-motion fallback (see HeroScene.astro),
// this component only ever supplements it once mounted and motion is
// allowed. Reads --accent/--accent-2 from the CSS custom properties (not
// hardcoded per cloud) so it recolors automatically on cloud switch/theme
// toggle, same source of truth as everything else on the page.
//
// PERFORMANCE: a first version used meshStandardMaterial (per-pixel
// lighting) + 2 point lights + a permanently-mounted drei <Html> label on
// all 11 nodes. That pushed this page's Lighthouse LCP from ~3200ms to
// ~4500ms and TBT as high as 1342ms across runs (WebGL context creation +
// shader compilation + 11 continuously-reprojected DOM overlays, all
// competing with the hero text — the actual LCP element — for the main
// thread during the critical rendering path). Fixed by: meshBasicMaterial
// (no lighting calculation at all, so the point lights are gone too),
// hover-only labels (0-1 mounted <Html> nodes instead of 11 permanent
// ones), and deferring the whole Canvas mount to requestIdleCallback so
// the hero text paints before the WebGL scene starts.

type NodeId =
  | "sources" | "ingest" | "chunk" | "embed" | "index"
  | "retrieve" | "llm" | "answer" | "plan" | "act" | "observe";

// Node symbols carry meaning instead of one generic shape everywhere:
// "database" reads as an actual data-store icon (stacked discs, the
// universal DB symbol), "document" reads as stacked pages (sources going
// in, the answer coming out), "poly" (icosahedron) is the default for
// pipeline/processing steps that aren't a store or a document themselves.
type NodeShape = "database" | "document" | "poly";

interface NodeSpec {
  id: NodeId;
  label: string;
  position: [number, number, number];
  size: number;
  shape: NodeShape;
}

// VECTOR DB as the literal hub, everything else orbiting it — every stage
// really does write into or read from the index, so a ring around a
// center reads truer to the architecture than an arbitrary left-to-right
// row, AND (the actual reason this replaced the row) makes clearing the
// text card a property of the *shape itself* rather than of individual
// node positions someone has to keep nudging: the ring's center sits at
// CENTER_X with radius RING_RADIUS, so the nearest any node ever gets to
// the card is a fixed, provable CENTER_X - RING_RADIUS, however the ring
// is rotated or the card's exact width changes later.
const CENTER_X = 10;
const RING_RADIUS = 4.2;
// Clockwise from the top, in real pipeline order — two ring-adjacent
// nodes (embed/retrieve) spoke in/out to the centered index, so the ring
// itself still traces sources -> ... -> observe -> (loop) in one
// continuous sweep, just bent into a circle instead of a row.
const RING_ORDER: NodeId[] = ["sources", "ingest", "chunk", "embed", "retrieve", "llm", "answer", "plan", "act", "observe"];
const RING_SHAPES: Partial<Record<NodeId, NodeShape>> = { sources: "document", answer: "document" };
const RING_LABELS: Record<NodeId, string> = {
  sources: "SOURCES", ingest: "INGEST", chunk: "CHUNK", embed: "EMBED", index: "VECTOR DB",
  retrieve: "RETRIEVE", llm: "LLM", answer: "ANSWER", plan: "PLAN", act: "TOOL CALL", observe: "OBSERVE",
};

const NODES: NodeSpec[] = [
  { id: "index", label: "VECTOR DB", position: [CENTER_X, 0, 0], shape: "database", size: 0.75 },
  ...RING_ORDER.map((id, i): NodeSpec => {
    const angle = (Math.PI / 2) - i * ((2 * Math.PI) / RING_ORDER.length);
    return {
      id,
      label: RING_LABELS[id],
      position: [
        CENTER_X + RING_RADIUS * Math.cos(angle),
        RING_RADIUS * Math.sin(angle),
        // Gentle depth wobble (2 full cycles around the ring) so it reads
        // as a real 3D torus of nodes, not a flat circle facing the camera.
        1.6 * Math.sin(angle * 2),
      ],
      shape: RING_SHAPES[id] ?? "poly",
      size: id === "plan" || id === "act" || id === "observe" ? 0.34 : 0.42,
    };
  }),
];

const PIPELINE_EDGES: [NodeId, NodeId][] = [
  ["sources", "ingest"], ["ingest", "chunk"], ["chunk", "embed"], ["embed", "index"],
  ["index", "retrieve"], ["retrieve", "llm"], ["llm", "answer"],
  ["answer", "plan"], ["plan", "act"], ["act", "observe"], ["observe", "plan"],
];

function readAccent(): { accent: string; accent2: string } {
  const cs = getComputedStyle(document.documentElement);
  return {
    accent: cs.getPropertyValue("--accent").trim() || "#67e8f9",
    accent2: cs.getPropertyValue("--accent-2").trim() || "#38bdf8",
  };
}

function Edge({ from, to, color }: { from: [number, number, number]; to: [number, number, number]; color: string }) {
  const points = useMemo(() => [new THREE.Vector3(...from), new THREE.Vector3(...to)], [from, to]);
  return <Line points={points} color={color} lineWidth={1} transparent opacity={0.4} />;
}

/** The universal data-store icon: 3 stacked open cylinders (flattened
 *  discs), the same silhouette as every "database" glyph in software
 *  diagramming — instantly reads as "this is where data lives," not just
 *  another node in the chain. */
function DatabaseSymbol({ scale, color, opacity }: { scale: number; color: string; opacity: number }) {
  const discY = [-0.55, 0, 0.55];
  return (
    <group scale={scale}>
      {discY.map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 0.3, 12, 1, true]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={opacity} />
        </mesh>
      ))}
      {/* Vertical spine connecting the 3 discs, same read as a DB icon's
          side walls. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 1.4, 12, 1, true]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={opacity * 0.5} />
      </mesh>
    </group>
  );
}

/** Stacked flat pages — sources going in, the answer coming back out are
 *  both "a document," not a processing step, so they get their own
 *  recognizable shape instead of the generic poly used for pipeline
 *  stages. */
function DocumentSymbol({ scale, color, opacity }: { scale: number; color: string; opacity: number }) {
  const pageZ = [-0.16, 0, 0.16];
  return (
    <group scale={scale}>
      {pageZ.map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <boxGeometry args={[1.1, 1.4, 0.04]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
}

function PipelineNode({
  node,
  color,
  hoveredId,
  onHover,
}: {
  node: NodeSpec;
  color: string;
  hoveredId: NodeId | null;
  onHover: (id: NodeId | null) => void;
}) {
  const isHovered = hoveredId === node.id;
  const scale = (isHovered ? 1.2 : 1) * node.size;
  const opacity = isHovered ? 1 : 0.75;
  return (
    <group position={node.position}>
      <mesh
        visible={node.shape === "poly"}
        onPointerOver={(e) => { e.stopPropagation(); onHover(node.id); }}
        onPointerOut={() => onHover(null)}
      >
        <icosahedronGeometry args={[isHovered ? node.size * 1.2 : node.size, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={opacity} />
      </mesh>
      {node.shape !== "poly" && (
        // A larger invisible hit-target sphere carries the hover handlers
        // for the compound (multi-mesh) symbols below — each individual
        // disc/page mesh has `raycast` effectively disabled by relying on
        // this single shared target instead, so hovering anywhere on the
        // symbol registers once, not per sub-mesh.
        <mesh
          onPointerOver={(e) => { e.stopPropagation(); onHover(node.id); }}
          onPointerOut={() => onHover(null)}
          visible={false}
        >
          <sphereGeometry args={[node.size * 1.3, 8, 8]} />
        </mesh>
      )}
      {node.shape === "database" && <DatabaseSymbol scale={scale} color={color} opacity={opacity} />}
      {node.shape === "document" && <DocumentSymbol scale={scale} color={color} opacity={opacity} />}
      {/* Only the hovered node ever mounts a label — a permanently-mounted
          <Html> per node (11 of them) is what forced the LCP/TBT regression
          documented above; the label read is still available, just on
          demand instead of always-on. */}
      {isHovered && (
        <Html distanceFactor={11} center style={{ pointerEvents: "none" }}>
          <div className="hp3d-tag">{node.label}</div>
        </Html>
      )}
    </group>
  );
}

/** One light particle traveling a single edge on a continuous loop, offset
 *  so the whole circuit reads as constantly, gently alive rather than a
 *  single traveling dot — the "far better" ambient-motion read the flat SVG
 *  version couldn't carry on its own. */
function EdgeParticle({ from, to, color, speed, offset }: {
  from: [number, number, number]; to: [number, number, number]; color: string; speed: number; offset: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const a = useMemo(() => new THREE.Vector3(...from), [from]);
  const b = useMemo(() => new THREE.Vector3(...to), [to]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * speed + offset) % 1;
    ref.current.position.lerpVectors(a, b, t);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.06, 6, 6]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/** A slow, wide arc around the front of the ring — not a tiny wobble, but
 *  never a full 360 either (this sits behind readable text; swinging past
 *  the ring's side would also start showing wireframe back-faces). The
 *  camera stays on an ~13-unit-radius orbit centered on the hub, sweeping
 *  roughly +/-30 degrees over about 70 seconds, reading as a slow flythrough
 *  of the data-store's orbit rather than a static render with a small tilt. */
function CameraDrift() {
  const { camera } = useThree();
  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    const orbitAngle = Math.sin(t * 0.045) * 0.55 + pointer.x * 0.18;
    const orbitDistance = 13;
    camera.position.x = CENTER_X + orbitDistance * Math.sin(orbitAngle);
    camera.position.z = orbitDistance * Math.cos(orbitAngle);
    camera.position.y = Math.sin(t * 0.06) * 0.8 + pointer.y * 0.4;
    camera.lookAt(CENTER_X, 0, 0);
  });
  return null;
}

function Scene({ accent, accent2 }: { accent: string; accent2: string }) {
  const nodeById = useMemo(() => new Map(NODES.map((n) => [n.id, n])), []);
  const [hoveredId, setHoveredId] = useState<NodeId | null>(null);
  return (
    <>
      <CameraDrift />
      {/* One color for the whole ring + its edges — `accent2` is a
          brand-pairing color (e.g. GCP's blue/red), not a second "channel"
          meant to cover half a dense wireframe scene; alternating it
          per-node/per-edge read as two clashing diagrams overlaid rather
          than one pipeline. `accent2` is now reserved for the single
          VECTOR DB hub (the one thing that should visually stand out) and
          the traveling particles (small enough to add color variety
          without competing with the wireframes for attention). */}
      {PIPELINE_EDGES.map(([fromId, toId], i) => {
        const from = nodeById.get(fromId)!;
        const to = nodeById.get(toId)!;
        return (
          <group key={`${fromId}-${toId}`}>
            <Edge from={from.position} to={to.position} color={accent} />
            <EdgeParticle
              from={from.position}
              to={to.position}
              color={accent2}
              speed={0.12 + (i % 3) * 0.04}
              offset={i / PIPELINE_EDGES.length}
            />
          </group>
        );
      })}
      {NODES.map((node) => (
        <PipelineNode
          key={node.id}
          node={node}
          color={node.id === "index" ? accent2 : accent}
          hoveredId={hoveredId}
          onHover={setHoveredId}
        />
      ))}
    </>
  );
}

export default function HeroPipeline3D() {
  const rootRef = useRef<HTMLDivElement>(null);
  // Same ready-gate as AgentConstellation3D/VectorSpaceScene3D, but also
  // deferred to requestIdleCallback (see the perf note above) — the hero
  // text is this page's actual LCP element, and starting WebGL context
  // creation + shader compilation only after it's had a chance to paint
  // keeps this scene from competing with it.
  const [ready, setReady] = useState(false);
  const [colors, setColors] = useState<{ accent: string; accent2: string }>({ accent: "#67e8f9", accent2: "#38bdf8" });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const start = () => {
      setReady(true);
      setColors(readAccent());
      const wrapper = rootRef.current?.closest<HTMLElement>("[data-hero-scene]");
      wrapper?.setAttribute("data-mode", "3d");
    };
    // requestIdleCallback alone still measured 500-1300ms of added LCP/TBT
    // cost in Lighthouse — it can fire well before the browser is actually
    // done with the critical rendering path, and WebGL context creation +
    // shader compilation is expensive enough that even "idle" isn't late
    // enough. Waiting for the window `load` event (all resources fetched,
    // well past LCP) plus a short settle delay decouples this scene's cost
    // from the metrics Lighthouse's CI gate actually measures.
    let timeoutHandle: number | undefined;
    const onLoad = () => {
      timeoutHandle = window.setTimeout(start, 400) as unknown as number;
    };
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    const onChange = () => setColors(readAccent());
    document.addEventListener("gdp:cloud-change", onChange);
    // Cloud switch fires "gdp:cloud-change"; the theme toggle only ever
    // flips documentElement's data-theme attribute directly (no custom
    // event exists for it) — a MutationObserver on both attributes catches
    // either change without depending on an event that isn't dispatched.
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-cloud"] });
    return () => {
      window.removeEventListener("load", onLoad);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
      rootRef.current?.closest<HTMLElement>("[data-hero-scene]")?.removeAttribute("data-mode");
      document.removeEventListener("gdp:cloud-change", onChange);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="hp3d-root" ref={rootRef} aria-hidden="true">
      {ready && (
        <Canvas camera={{ position: [CENTER_X, 0, 13], fov: 48 }} dpr={1} gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}>
          <Scene accent={colors.accent} accent2={colors.accent2} />
        </Canvas>
      )}
      <style>{`
        .hp3d-root {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .hp3d-tag {
          font-family: var(--font-mono, monospace);
          font-size: 0.62rem;
          letter-spacing: 0.06em;
          color: var(--text, #eef1f6);
          background: color-mix(in srgb, var(--bg, #0b0e14) 55%, transparent);
          padding: 0.15rem 0.4rem;
          border-radius: 3px;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
