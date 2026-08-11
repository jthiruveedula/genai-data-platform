import { useMemo, useRef, useState, useCallback, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";

// "12 missions, one continuous journey" as an actual 3D flight path — the
// curriculum's own module order (data/modules.ts) walked as a spline curve
// through space, colored by learning lane. Not a real spatial encoding of
// anything (unlike VectorSpaceScene3D's embedding illustration) — this is a
// literal visualization of a sequence, positions chosen only to keep 12
// waypoints readably spread out along a gentle curve.
//
// Scroll-linked camera: it doesn't auto-orbit — it flies ALONG this same curve
// as the section scrolls through the viewport, computed once per frame from
// the container's own getBoundingClientRect() rather than a pinned/extended
// scroll distance, so it never changes the page's scroll length or trips the
// existing no-horizontal-overflow layout tests.
//
// This is the *live* version of the "scroll drives a camera" idea: a small
// canvas embedded in a normal page, cheap enough to sit inside a section. The
// full-page treatment — a pre-rendered flight through the whole platform,
// scrubbed frame by frame — is `/world/` (see tools/scroll-world/README.md).
// Same contract, different budget: this one renders live and stays interactive
// (hover a waypoint), that one buys cinematic depth by shipping video.

export type FlightWaypoint = {
  id: string;
  order: number;
  title: string;
  lane: "beginner" | "intermediate" | "advanced";
};

const LANE_COLOR: Record<FlightWaypoint["lane"], string> = {
  beginner: "#34d399",
  intermediate: "#60a5fa",
  advanced: "#f472b6",
};

function waypointPosition(index: number, total: number): [number, number, number] {
  const t = index / Math.max(1, total - 1);
  const angle = t * Math.PI * 2.4 - Math.PI * 0.2;
  const radius = 2.4 + t * 1.6;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius * 0.6;
  const y = (t - 0.5) * 3.2;
  return [x, y, z];
}

function FlightPath({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const linePoints = useMemo(() => curve.getPoints(200), [curve]);
  return <Line points={linePoints} color="#3d4a63" lineWidth={1.5} transparent opacity={0.6} />;
}

function Waypoints({
  waypoints,
  positions,
  hoveredId,
  onHover,
}: {
  waypoints: FlightWaypoint[];
  positions: [number, number, number][];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  return (
    <>
      {waypoints.map((w, i) => {
        const isHovered = hoveredId === w.id;
        return (
          <group key={w.id} position={positions[i]}>
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                onHover(w.id);
              }}
              onPointerOut={() => onHover(null)}
            >
              <sphereGeometry args={[isHovered ? 0.16 : 0.11, 16, 16]} />
              <meshStandardMaterial
                color={LANE_COLOR[w.lane]}
                emissive={LANE_COLOR[w.lane]}
                emissiveIntensity={isHovered ? 0.9 : 0.4}
              />
            </mesh>
            {isHovered && (
              <Html distanceFactor={8} center>
                <div className="flight-tooltip">
                  <span className="flight-tooltip__order">{String(w.order).padStart(2, "0")}</span>
                  <span className="flight-tooltip__title">{w.title}</span>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}

/** Reads scroll progress off the DOM container each frame (rAF, via R3F's
 * own render loop — no extra scroll listener) and flies the camera along
 * `curve` accordingly. `rootRef` is the Canvas wrapper's own DOM ref — its
 * `.current` is only populated after mount, so the ancestor lookup happens
 * once in an effect here, not read at render time (a ref read during render
 * would always see the pre-mount `null`, before the effect that sets it up
 * has run). Falls back to a fixed framing if no ancestor is found. */
function ScrollCamera({ curve, rootRef }: { curve: THREE.CatmullRomCurve3; rootRef: React.RefObject<HTMLDivElement | null> }) {
  const { camera } = useThree();
  const progressRef = useRef(0);
  const smoothedRef = useRef(0);
  const containerElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    containerElRef.current = rootRef.current?.closest<HTMLElement>("[data-curriculum-flight-3d]") ?? null;
  }, [rootRef]);

  useFrame((_, delta) => {
    const containerEl = containerElRef.current;
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the section's top just enters the viewport bottom, 1 when its
      // bottom leaves the viewport top — the same "while it's on screen" span
      // CurriculumJourney's own spine-fill animation already scrubs against.
      const span = vh + rect.height || 1;
      const raw = (vh - rect.top) / span;
      progressRef.current = Math.min(1, Math.max(0, raw));
    }
    // Light smoothing so a fast flick/scroll-jump doesn't snap the camera —
    // still fully scroll-driven, just not jittery frame to frame.
    smoothedRef.current += (progressRef.current - smoothedRef.current) * Math.min(1, delta * 6);

    const t = smoothedRef.current;
    const lookAheadT = Math.min(1, t + 0.04);
    const point = curve.getPointAt(t);
    const lookAt = curve.getPointAt(lookAheadT);
    // Pull the camera back from the curve itself so waypoints stay in view
    // rather than the camera flying exactly through each sphere.
    const offset = new THREE.Vector3(0, 0.6, 2.4);
    camera.position.set(point.x + offset.x, point.y + offset.y, point.z + offset.z);
    camera.lookAt(lookAt);
  });

  return null;
}

export default function CurriculumFlight3D({ waypoints }: { waypoints: FlightWaypoint[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Same reduced-motion / hydration gate as VectorSpaceScene3D — see that
  // file's comment for why `ready` must start false and only flip inside an
  // effect, never during SSR/first-client render.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setReady(true);
    const wrapper = rootRef.current?.closest<HTMLElement>("[data-curriculum-flight-3d]");
    wrapper?.setAttribute("data-mode", "3d");
    return () => {
      wrapper?.removeAttribute("data-mode");
    };
  }, []);

  const positions = useMemo(() => waypoints.map((_, i) => waypointPosition(i, waypoints.length)), [waypoints]);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(positions.map((p) => new THREE.Vector3(...p))),
    [positions],
  );

  return (
    <div className="flight3d-root" ref={rootRef}>
      <div className="flight3d-canvas-wrap">
        {ready && (
          <Canvas camera={{ position: [0, 0, 8.5], fov: 45 }} dpr={[1, 1.5]}>
            <Suspense fallback={null}>
              <ambientLight intensity={0.6} />
              <pointLight position={[5, 5, 5]} intensity={40} />
              <FlightPath curve={curve} />
              <Waypoints waypoints={waypoints} positions={positions} hoveredId={hoveredId} onHover={setHoveredId} />
              <ScrollCamera curve={curve} rootRef={rootRef} />
            </Suspense>
          </Canvas>
        )}
      </div>
    </div>
  );
}
