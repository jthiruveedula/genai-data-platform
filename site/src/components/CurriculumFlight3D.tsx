import { useMemo, useRef, useState, useCallback, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";

// "12 missions, one continuous journey" as an actual 3D flight path — the
// curriculum's own module order (data/modules.ts) walked as a spline curve
// through space, colored by learning lane. Not a real spatial encoding of
// anything (unlike VectorSpaceScene3D's embedding illustration) — this is a
// literal visualization of a sequence, positions chosen only to keep 12
// waypoints readably spread out along a gentle curve.

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

function FlightPath({ points }: { points: [number, number, number][] }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), [points]);
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

function AutoOrbit({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.08;
  });
  return <group ref={groupRef}>{children}</group>;
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

  return (
    <div className="flight3d-root" ref={rootRef}>
      <div className="flight3d-canvas-wrap">
        {ready && (
          <Canvas camera={{ position: [0, 0, 8.5], fov: 45 }} dpr={[1, 1.5]}>
            <Suspense fallback={null}>
              <ambientLight intensity={0.6} />
              <pointLight position={[5, 5, 5]} intensity={40} />
              <AutoOrbit>
                <FlightPath points={positions} />
                <Waypoints waypoints={waypoints} positions={positions} hoveredId={hoveredId} onHover={setHoveredId} />
              </AutoOrbit>
              <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 3} maxPolarAngle={(2 * Math.PI) / 3} />
            </Suspense>
          </Canvas>
        )}
      </div>
    </div>
  );
}
