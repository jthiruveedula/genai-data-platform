import { useMemo, useRef, useState, useCallback, useEffect, Suspense } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

// Synthetic embedding-space dataset: 5 semantic clusters of chunk "points" in
// 3D. This is not a real embedding projection — it's illustrative data sized
// and shaped to look like one, reusing the same clustering idea as the 2D
// VectorSpaceScene.astro fallback but expanded to more clusters/points.
type ChunkPoint = {
  id: string;
  position: [number, number, number];
  text: string;
  cluster: number;
};

type Cluster = {
  label: string;
  color: string;
  center: [number, number, number];
};

const CLUSTERS: Cluster[] = [
  { label: "Pricing & billing", color: "#4285f4", center: [-2.4, 1.2, 0.6] },
  { label: "Auth & access control", color: "#ea4335", center: [2.2, 1.6, -1.0] },
  { label: "Retrieval & search", color: "#fbbc04", center: [-1.6, -1.4, 1.8] },
  { label: "Deployment & infra", color: "#34a853", center: [1.8, -1.2, -1.6] },
  { label: "Model behavior & limits", color: "#a3e635", center: [0.2, 2.2, 1.9] },
];

const CHUNK_TEXTS = [
  "Refunds are issued to the original payment method within 5-7 business days.",
  "Enterprise plans include a dedicated invoicing contact and net-30 terms.",
  "Usage-based overage is billed monthly in arrears at the metered rate.",
  "Rotate API keys from the console; old keys are revoked after 24 hours.",
  "Service accounts support scoped roles for least-privilege access.",
  "SSO via SAML is available on the Business tier and above.",
  "Hybrid search blends dense vector similarity with keyword BM25 scoring.",
  "Re-ranking the top-K candidates improves precision at a latency cost.",
  "Chunk overlap of 10-15% helps preserve context across boundaries.",
  "Autoscaling adds replicas when p95 latency crosses the configured threshold.",
  "Blue/green deploys cut over traffic only after health checks pass.",
  "Regional failover requires cross-region replication to be enabled first.",
  "The model's context window truncates the oldest turns first, not the newest.",
  "Temperature above 1.0 is not recommended for structured output tasks.",
  "Rate limits reset on a rolling 60-second window, not a fixed clock minute.",
];

function makeChunks(): ChunkPoint[] {
  const points: ChunkPoint[] = [];
  let textIdx = 0;
  CLUSTERS.forEach((cluster, ci) => {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const [cx, cy, cz] = cluster.center;
      const spread = 0.75;
      points.push({
        id: `c${ci}-${i}`,
        cluster: ci,
        position: [
          cx + (Math.random() - 0.5) * spread * 2,
          cy + (Math.random() - 0.5) * spread * 2,
          cz + (Math.random() - 0.5) * spread * 2,
        ],
        text: CHUNK_TEXTS[textIdx % CHUNK_TEXTS.length],
      });
      textIdx++;
    }
  });
  return points;
}

function distance(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/** Deterministic synthetic "embedding" for arbitrary query text: hash the
 * string into a 3D point so the same query always lands in the same place.
 * This is illustrative only — not a real embedding model. */
function syntheticEmbed(text: string): [number, number, number] {
  let h1 = 0, h2 = 0, h3 = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = (h1 * 31 + code) % 10007;
    h2 = (h2 * 37 + code) % 10007;
    h3 = (h3 * 41 + code) % 10007;
  }
  const scale = 2.6;
  return [
    ((h1 / 10007) - 0.5) * scale * 2,
    ((h2 / 10007) - 0.5) * scale * 2,
    ((h3 / 10007) - 0.5) * scale * 2,
  ];
}

function ClusterPoints({
  chunks,
  activeCluster,
  onHover,
}: {
  chunks: ChunkPoint[];
  activeCluster: number | null;
  onHover: (chunk: ChunkPoint | null) => void;
}) {
  return (
    <>
      {chunks.map((chunk) => {
        const dimmed = activeCluster !== null && activeCluster !== chunk.cluster;
        const color = CLUSTERS[chunk.cluster].color;
        return (
          <mesh
            key={chunk.id}
            position={chunk.position}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              onHover(chunk);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              onHover(null);
              document.body.style.cursor = "auto";
            }}
          >
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={dimmed ? 0.12 : 0.9}
              emissive={color}
              emissiveIntensity={dimmed ? 0 : 0.35}
            />
          </mesh>
        );
      })}
    </>
  );
}

function QueryPoint({
  target,
  onArrived,
}: {
  target: [number, number, number];
  onArrived: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  useFrame((_, delta) => {
    if (!ref.current) return;
    progress.current = Math.min(1, progress.current + delta * 0.8);
    const t = 1 - (1 - progress.current) ** 3; // ease-out cubic
    ref.current.position.set(target[0] * t, target[1] * t, target[2] * t);
    if (progress.current >= 1) onArrived();
  });
  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <sphereGeometry args={[0.16, 16, 16]} />
      <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
    </mesh>
  );
}

function SceneContents({
  chunks,
  activeCluster,
  onHover,
  hovered,
  queryTarget,
  onQueryArrived,
}: {
  chunks: ChunkPoint[];
  activeCluster: number | null;
  onHover: (c: ChunkPoint | null) => void;
  hovered: ChunkPoint | null;
  queryTarget: [number, number, number] | null;
  onQueryArrived: () => void;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={1.2} />
      <ClusterPoints chunks={chunks} activeCluster={activeCluster} onHover={onHover} />
      {queryTarget && <QueryPoint target={queryTarget} onArrived={onQueryArrived} />}
      {hovered && (
        <Html position={hovered.position} distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="v3d-tooltip">
            <p className="v3d-tooltip-text">&ldquo;{hovered.text}&rdquo;</p>
            <p className="v3d-tooltip-score">
              similarity {(0.72 + Math.random() * 0.24).toFixed(2)} · {CLUSTERS[hovered.cluster].label}
            </p>
          </div>
        </Html>
      )}
      <OrbitControls enablePan={false} minDistance={2} maxDistance={12} />
    </>
  );
}

export default function VectorSpaceScene3D() {
  const chunks = useMemo(() => makeChunks(), []);
  const [activeCluster, setActiveCluster] = useState<number | null>(null);
  const [hovered, setHovered] = useState<ChunkPoint | null>(null);
  const [query, setQuery] = useState("");
  const [queryTarget, setQueryTarget] = useState<[number, number, number] | null>(null);
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Gate the whole 3D scene on prefers-reduced-motion, checked once at
  // hydration time (this component only ever hydrates via client:visible,
  // i.e. already lazily, in the browser). Deliberately a plain matchMedia
  // boolean check, not gsap.matchMedia().add() — that API never fires its
  // callback for the "false"/no-preference case in this repo's gsap version
  // (see VectorSpaceScene.astro), so the same footgun is avoided here too
  // even though this scene doesn't use gsap at all.
  //
  // IMPORTANT: this starts `false` and is only ever flipped to `true` inside
  // an effect (i.e. after mount, in the browser). It must NOT be computed
  // during the initial render as `typeof window === "undefined" ? false :
  // ...` and used to `return null` — that makes the component's *server*
  // render (and its React-hydration-mismatch-safe first client render)
  // produce no DOM output at all. Astro's `client:visible` directive works
  // by running an IntersectionObserver over this island's *server-rendered
  // children* — if there are none, the observer has nothing to watch and the
  // island never hydrates, for anyone, regardless of scroll position or
  // motion preference (verified: with the old `return null` gate, the 3D
  // canvas never mounted even under normal motion). Always rendering the
  // wrapper markup (with the expensive <Canvas>/controls gated on `ready`
  // instead) keeps the island non-empty so client:visible can do its job.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // reduced motion: leave the static SVG fallback as-is.
    setReady(true);
    const wrapper = rootRef.current?.closest<HTMLElement>("[data-vector-scene-3d]");
    wrapper?.setAttribute("data-mode", "3d");
    return () => {
      wrapper?.removeAttribute("data-mode");
    };
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = query.trim();
      if (!text) return;
      const embedded = syntheticEmbed(text);
      let nearestCluster = 0;
      let best = Infinity;
      CLUSTERS.forEach((c, ci) => {
        const d = distance(embedded, c.center);
        if (d < best) {
          best = d;
          nearestCluster = ci;
        }
      });
      setQueryResult(CLUSTERS[nearestCluster].label);
      setQueryTarget(CLUSTERS[nearestCluster].center);
    },
    [query],
  );

  return (
    <div className="v3d-root" ref={rootRef}>
      <div className="v3d-canvas-wrap">
        {ready && (
          <Canvas camera={{ position: [0, 0, 7], fov: 50 }} dpr={[1, 1.5]}>
            <Suspense fallback={null}>
              <SceneContents
                chunks={chunks}
                activeCluster={activeCluster}
                onHover={setHovered}
                hovered={hovered}
                queryTarget={queryTarget}
                onQueryArrived={() => {
                  /* leave the point resting at the cluster */
                }}
              />
            </Suspense>
          </Canvas>
        )}
      </div>

      {ready && (
        <div className="v3d-controls">
          <form className="v3d-query" onSubmit={handleSubmit}>
            <label htmlFor="v3d-query-input">Try a query</label>
            <div className="v3d-query-row">
              <input
                id="v3d-query-input"
                type="text"
                placeholder="e.g. how do refunds work?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit">Embed &amp; search</button>
            </div>
            {queryResult && (
              <p className="v3d-query-result">
                Nearest cluster: <strong>{queryResult}</strong>
              </p>
            )}
          </form>

          <ul className="v3d-legend" role="list">
            {CLUSTERS.map((c, ci) => (
              <li key={c.label}>
                <button
                  type="button"
                  className="v3d-legend-item"
                  aria-pressed={activeCluster === ci}
                  data-dimmed={activeCluster !== null && activeCluster !== ci}
                  onClick={() => setActiveCluster((prev) => (prev === ci ? null : ci))}
                >
                  <span className="v3d-swatch" style={{ background: c.color }} aria-hidden="true" />
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        .v3d-root {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .v3d-canvas-wrap {
          width: 100%;
          aspect-ratio: 4 / 3;
          max-height: 26rem;
          border-radius: var(--radius, 8px);
          overflow: hidden;
          background: radial-gradient(circle at 50% 40%, #10131c, #05060a);
          touch-action: none;
        }
        .v3d-tooltip {
          background: rgba(10, 10, 14, 0.92);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          padding: 0.5rem 0.65rem;
          font-size: 0.7rem;
          max-width: 14rem;
          font-family: var(--font-mono, monospace);
        }
        .v3d-tooltip-text {
          margin: 0 0 0.25rem;
        }
        .v3d-tooltip-score {
          margin: 0;
          opacity: 0.7;
        }
        .v3d-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: space-between;
          align-items: flex-start;
        }
        .v3d-query {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.8rem;
          flex: 1 1 16rem;
        }
        .v3d-query label {
          color: var(--text-secondary);
          font-family: var(--font-mono, monospace);
          font-size: 0.75rem;
        }
        .v3d-query-row {
          display: flex;
          gap: 0.5rem;
        }
        .v3d-query-row input {
          flex: 1;
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          border: 1px solid var(--border, #333);
          background: var(--bg, #111);
          color: var(--text, #eee);
          font-size: 0.85rem;
        }
        .v3d-query-row button {
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--accent, #4285f4);
          background: var(--accent, #4285f4);
          color: #fff;
          font-size: 0.8rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .v3d-query-result {
          margin: 0;
          color: var(--text-secondary);
        }
        .v3d-legend {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          margin: 0;
          padding: 0;
        }
        .v3d-legend-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: none;
          border: none;
          padding: 0.15rem 0.3rem;
          font-size: 0.75rem;
          color: var(--text, #eee);
          cursor: pointer;
          border-radius: 4px;
          font-family: var(--font-mono, monospace);
        }
        .v3d-legend-item[data-dimmed="true"] {
          opacity: 0.4;
        }
        .v3d-legend-item[aria-pressed="true"] {
          background: var(--bg-card, rgba(255,255,255,0.06));
        }
        .v3d-swatch {
          width: 0.65rem;
          height: 0.65rem;
          border-radius: 50%;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}
