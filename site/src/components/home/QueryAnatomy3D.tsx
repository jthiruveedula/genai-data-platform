/**
 * One query, priced — two skylines of the same five things.
 *
 * The FRONT row is what you send: bar height is tokens. The BACK row is what
 * you pay: bar height is dollars. A ribbon joins each segment's two heights,
 * and the ribbons cross — the retrieved context towers in front and barely
 * registers behind, the generated answer is the shortest bar in front and the
 * tallest behind. That crossing IS the lesson, and it needs two planes to
 * exist, which is why this is in 3D rather than a bar chart.
 *
 * (An earlier cut encoded price as bar DEPTH so that volume equalled money. It
 * was technically faithful and visually useless: a bar eight times deeper than
 * it is tall reads as a slab lying on the floor, not as "expensive".)
 *
 * Everything drawn comes from `lib/queryCost.ts`, which prices real, verified
 * numbers out of `data/pricing.json`. Nothing here invents a figure; on a
 * GPU-metered cloud the money skyline drops to nothing and says why, rather
 * than pretending a per-token price exists.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import {
  type CloudId,
  type CostSegment,
  type QueryCost,
  queryCost,
} from "../../lib/queryCost";

const GAP = 0.55;
const BAR_W = 1.5;
/** Tallest solid, in scene units — everything scales against the biggest segment. */
const MAX_H = 4.2;


function useTokens() {
  const [ink, setInk] = useState({
    accent: "#ec3013",
    text: "#201e1d",
    border: "#bab6b6",
    ground: "#f3f2f2",
  });
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const pick = (n: string, f: string) => s.getPropertyValue(n).trim() || f;
      setInk({
        accent: pick("--accent", "#ec3013"),
        text: pick("--text", "#201e1d"),
        border: pick("--border", "#bab6b6"),
        ground: pick("--bg-raised", "#f3f2f2"),
      });
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-cloud", "data-pf-cloud", "data-theme"],
    });
    return () => mo.disconnect();
  }, []);
  return ink;
}

/** Wireframe box: edges only, so a solid never becomes a block of flat colour. */
function BarEdges({
  w,
  h,
  d,
  color,
  opacity,
  lineWidth = 1.4,
}: {
  w: number;
  h: number;
  d: number;
  color: string;
  opacity: number;
  lineWidth?: number;
}) {
  const segments = useMemo(() => {
    const x = w / 2;
    const z = d / 2;
    const bottom: [number, number, number][] = [
      [-x, 0, -z],
      [x, 0, -z],
      [x, 0, z],
      [-x, 0, z],
      [-x, 0, -z],
    ];
    const top: [number, number, number][] = bottom.map(([a, , c]) => [a, h, c]);
    const posts: [number, number, number][][] = bottom
      .slice(0, 4)
      .map(([a, , c]) => [
        [a, 0, c],
        [a, h, c],
      ]);
    return [bottom, top, ...posts];
  }, [w, h, d]);

  return (
    <>
      {segments.map((pts, i) => (
        <Line key={i} points={pts} color={color} lineWidth={lineWidth} transparent opacity={opacity} />
      ))}
    </>
  );
}

function Bars({
  cost,
  focus,
  onFocus,
}: {
  cost: QueryCost;
  focus: string | null;
  onFocus: (id: string | null) => void;
}) {
  const ink = useTokens();
  const rig = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const maxTokens = Math.max(...cost.segments.map((s) => s.tokens));
  const maxUsd = Math.max(...cost.segments.map((s) => s.usd), 1e-9);
  const perToken = cost.metering === "per-token";

  useEffect(() => {
    camera.position.set(0.2, 6.9, 15.2);
    camera.lookAt(0, 1.0, 0);
  }, [camera]);

  // Cost heights animate on a cloud switch: the token skyline is fixed (the
  // same work happens everywhere), the money skyline is what changes shape.
  const costH = useRef<number[]>(cost.segments.map(() => 0));

  useFrame((_, delta) => {
    if (rig.current) {
      rig.current.rotation.y = Math.sin(performance.now() / 7000) * 0.16;
    }
    cost.segments.forEach((s, i) => {
      const target = perToken ? 0.04 + (s.usd / maxUsd) * MAX_H : 0;
      costH.current[i] += (target - costH.current[i]) * Math.min(1, delta * 3.5);
    });
  });

  const totalW = cost.segments.length * (BAR_W + GAP) - GAP;
  const ROW_Z = 3.6;

  return (
    <group ref={rig} position={[0, -1.1, -0.6]}>
      {/* Two grounds: what you SEND in front, what you PAY behind. */}
      {[ROW_Z, -ROW_Z].map((z, i) => (
        <Line
          key={i}
          points={[
            [-totalW / 2 - 0.7, 0, z],
            [totalW / 2 + 0.7, 0, z],
          ]}
          color={ink.text}
          lineWidth={1.6}
          transparent
          opacity={0.75}
        />
      ))}

      <Html center distanceFactor={15} position={[-totalW / 2 - 1.9, 0.25, ROW_Z]}>
        <div className="qa-axis">tokens sent</div>
      </Html>
      <Html center distanceFactor={15} position={[-totalW / 2 - 1.9, 0.25, -ROW_Z]}>
        <div className="qa-axis qa-axis--cost">{perToken ? "money spent" : "GPU-hour metered"}</div>
      </Html>

      {cost.segments.map((s, i) => {
        const x = -totalW / 2 + BAR_W / 2 + i * (BAR_W + GAP);
        const hTok = 0.06 + (s.tokens / maxTokens) * MAX_H;
        const hUsd = costH.current[i] ?? 0;
        const isFocus = focus === s.id;
        const emphasis = isFocus ? 1 : 0.62;

        return (
          <group key={s.id} position={[x, 0, 0]}>
            <mesh
              position={[0, MAX_H / 2, 0]}
              visible={false}
              onPointerOver={(e) => {
                e.stopPropagation();
                onFocus(s.id);
              }}
              onPointerOut={() => onFocus(null)}
            >
              <boxGeometry args={[BAR_W + GAP * 0.7, MAX_H * 1.2, ROW_Z * 2.6]} />
            </mesh>

            {/* Front: how much of the request this is. */}
            <group position={[0, 0, ROW_Z]}>
              <BarEdges
                w={BAR_W}
                h={hTok}
                d={0.9}
                color={ink.text}
                opacity={emphasis}
                lineWidth={isFocus ? 2 : 1.2}
              />
            </group>

            {/* Back: how much of the bill this is. Accent, because this is the
                half that surprises people. */}
            <group position={[0, 0, -ROW_Z]}>
              <BarEdges
                w={BAR_W}
                h={Math.max(hUsd, 0.02)}
                d={0.9}
                color={ink.accent}
                opacity={perToken ? (isFocus ? 1 : 0.75) : 0.25}
                lineWidth={isFocus ? 2.2 : 1.5}
              />
            </group>

            {/* The ribbon between them. Where it slopes DOWN, a lot of tokens
                cost little; where it slopes UP, few tokens cost a lot. The
                crossing ribbons are the entire argument. */}
            <Line
              points={[
                [0, hTok, ROW_Z],
                [0, Math.max(hUsd, 0.02), -ROW_Z],
              ]}
              color={isFocus ? ink.accent : ink.border}
              lineWidth={isFocus ? 2 : 1}
              transparent
              opacity={isFocus ? 1 : 0.55}
              dashed={!isFocus}
              dashSize={0.22}
              gapSize={0.18}
            />

            <Html center distanceFactor={15} position={[0, -0.5, ROW_Z]}>
              <div className={`qa-tick${isFocus ? " is-focus" : ""}`}>
                {s.tokens.toLocaleString()}
                <span className="qa-tick__unit">tok</span>
              </div>
            </Html>
            {perToken && (isFocus || s.id === "answer" || s.id === "context") && (
              <Html center distanceFactor={15} position={[0, Math.max(hUsd, 0.02) + 0.45, -ROW_Z]}>
                <div className={`qa-tick qa-tick--cost${isFocus ? " is-focus" : ""}`}>
                  {s.usd >= 0.01 ? `$${s.usd.toFixed(3)}` : `$${s.usd.toFixed(5)}`}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

const fmtUsd = (n: number) =>
  n >= 0.01 ? `$${n.toFixed(3)}` : `$${n.toFixed(5)}`;

export default function QueryAnatomy3D({ initialCloud = "gcp" }: { initialCloud?: CloudId }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState<CloudId>(initialCloud);
  const [focus, setFocus] = useState<string | null>(null);

  // The scene mirrors the site-wide cloud selection rather than owning its own:
  // switching cloud in the navbar must change the shape of the bill here too.
  useEffect(() => {
    const read = () => {
      const attr = document.documentElement.getAttribute("data-cloud");
      if (attr === "gcp" || attr === "aws" || attr === "azure" || attr === "oss") {
        setCloud(attr);
      }
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-cloud"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setReady(true);
    const wrap = rootRef.current?.closest<HTMLElement>("[data-query-anatomy]");
    wrap?.setAttribute("data-mode", "3d");
    return () => wrap?.removeAttribute("data-mode");
  }, []);

  const cost = useMemo(() => queryCost(cloud), [cloud]);
  const segment: CostSegment | undefined = focus
    ? cost.segments.find((s) => s.id === focus)
    : undefined;

  return (
    <div className="qa-root" ref={rootRef}>
      {ready && (
        <>
          <div className="qa-canvas">
            <Canvas camera={{ position: [0.2, 6.9, 15.2], fov: 34 }} dpr={[1, 1.5]}>
              <Bars cost={cost} focus={focus} onFocus={setFocus} />
            </Canvas>
          </div>

          <div className="qa-readout" aria-live="polite">
            {segment ? (
              <p className="qa-readout__line">
                <strong>{segment.label}</strong> — {segment.tokens.toLocaleString()} tokens
                {cost.metering === "per-token" ? (
                  <>
                    {" "}
                    at ${segment.usdPerMtok}/Mtok = <strong>{fmtUsd(segment.usd)}</strong>
                  </>
                ) : (
                  <> — billed by GPU hour, not by token</>
                )}
                . {segment.note}
              </p>
            ) : (
              <p className="qa-readout__line qa-readout__line--idle">
                Front row: tokens sent. Back row: money spent. The ribbons cross — point at a
                segment for its numbers.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
