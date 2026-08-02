import { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";

// The multi-agent diagram's 3D companion (redesign phase 1, issue #147) —
// same structural pattern as CurriculumFlight3D.tsx: a static 2D SVG is
// always in the markup as the reduced-motion/no-JS/pre-hydration view, and
// this component only ever supplements it once mounted. Unlike
// CurriculumFlight3D's scroll-linked camera, this scene is small and
// always fully on screen once its parent panel is visible, so a gentle
// idle rotation reads better than a scroll-driven camera would for a
// diagram this size.

type Role = "supervisor" | "worker-a" | "worker-b";

const NODE_POSITION: Record<Role, [number, number, number]> = {
  supervisor: [0, 0.6, 0],
  "worker-a": [-1.5, -0.55, 0.3],
  "worker-b": [1.5, -0.55, -0.3],
};

const NODE_LABEL: Record<Role, string> = {
  supervisor: "SUPERVISOR",
  "worker-a": "WORKER",
  "worker-b": "WORKER",
};

const ACCENT = "#67e8f9";
const LINE_COLOR = "#3d4a63";

function Branch({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const points = useMemo(() => [new THREE.Vector3(...from), new THREE.Vector3(...to)], [from, to]);
  return <Line points={points} color={LINE_COLOR} lineWidth={1.5} transparent opacity={0.7} />;
}

function Node({ role, hoveredId, onHover }: { role: Role; hoveredId: Role | null; onHover: (r: Role | null) => void }) {
  const isHovered = hoveredId === role;
  const isSupervisor = role === "supervisor";
  return (
    <group position={NODE_POSITION[role]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(role);
        }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[isHovered ? 0.22 : isSupervisor ? 0.18 : 0.15, 20, 20]} />
        <meshStandardMaterial
          color={isSupervisor ? ACCENT : "#98a2b3"}
          emissive={isSupervisor ? ACCENT : "#98a2b3"}
          emissiveIntensity={isHovered ? 0.9 : isSupervisor ? 0.55 : 0.3}
        />
      </mesh>
      <Html distanceFactor={7} center>
        <div className={`agent3d-tag ${isSupervisor ? "agent3d-tag--supervisor" : ""}`}>{NODE_LABEL[role]}</div>
      </Html>
    </group>
  );
}

/** Slow, continuous rotation of the whole constellation — never gated
 *  behind an interaction, only mounted at all when reduced-motion allows
 *  it (see the parent component's `ready` gate below). */
function IdleRotate({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.18;
  });
  return <group ref={ref}>{children}</group>;
}

export default function AgentConstellation3D() {
  const [hoveredId, setHoveredId] = useState<Role | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Same reduced-motion / hydration gate as CurriculumFlight3D — `ready`
  // must start false and only flip inside an effect, never during
  // SSR/first-client render, or a reduced-motion visitor would see the 3D
  // scene flash in before this effect has a chance to bail out.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setReady(true);
    const wrapper = rootRef.current?.closest<HTMLElement>('[data-loop-diagram="multi"]');
    wrapper?.setAttribute("data-mode", "3d");
    return () => {
      wrapper?.removeAttribute("data-mode");
    };
  }, []);

  const roles: Role[] = ["supervisor", "worker-a", "worker-b"];

  return (
    <div className="agent3d-root" ref={rootRef}>
      <div className="agent3d-canvas-wrap">
        {ready && (
          <Canvas camera={{ position: [0, 0, 6.6], fov: 40 }} dpr={[1, 1.5]}>
            <ambientLight intensity={0.65} />
            <pointLight position={[3, 3, 4]} intensity={30} />
            <IdleRotate>
              <Branch from={NODE_POSITION.supervisor} to={NODE_POSITION["worker-a"]} />
              <Branch from={NODE_POSITION.supervisor} to={NODE_POSITION["worker-b"]} />
              {roles.map((role) => (
                <Node key={role} role={role} hoveredId={hoveredId} onHover={setHoveredId} />
              ))}
            </IdleRotate>
          </Canvas>
        )}
      </div>
    </div>
  );
}
