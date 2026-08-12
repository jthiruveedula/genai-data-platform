/**
 * "Where the money goes" — a 24-second film of one query's economics.
 *
 * The homepage section (`/#query-cost`) is interactive: you hover a segment and
 * read its numbers. This is the part an interactive cannot do — tell the story
 * in an order, with time between the beats:
 *
 *   1. the request assembles, token by token
 *   2. the money skyline rises against it — and disagrees
 *   3. the same query escalates to a reasoning tier
 *   4. the same query, self-hosted, where tokens stop being the meter
 *
 * Every figure is computed by `queryCost.ts` — the SITE'S model, copied in by
 * `render.sh` at render time along with `pricing.json`, so the film cannot
 * quote a number the page doesn't. If prices are re-verified, re-rendering is
 * the whole update.
 *
 * Drawn in the same register as /world/: paper ground, ink hairlines, one
 * vermilion accent, drafting brackets. Nothing is filled except the payload.
 */

import { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ALL_CLOUDS, queryCost, type CloudId } from "./queryCost";

const INK = "#201e1d";
const MUTE = "#7d7979";
const LINE = "#bab6b6";
const ACCENT = "#ec3013";
const GROUND = "#f3f2f2";

/** Beat boundaries in seconds. The film is cut to these, not to a music track. */
export const BEATS = {
  assemble: [0, 7],
  compare: [7, 14],
  escalate: [14, 19],
  selfHost: [19, 24],
} as const;

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

function Kicker({ text, sub }: { text: string; sub?: string }) {
  return (
    <div style={{ position: "absolute", left: 64, top: 56 }}>
      <div
        style={{
          fontFamily: "Archivo, sans-serif",
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: ACCENT,
        }}
      >
        {text}
      </div>
      {sub && (
        <div
          style={{
            marginTop: 10,
            fontFamily: "Archivo, sans-serif",
            fontWeight: 800,
            fontSize: 38,
            letterSpacing: "-0.02em",
            color: INK,
            maxWidth: 900,
            lineHeight: 1.04,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/** A bar drawn as a drafting outline, with its own tick and caption. */
function Bar({
  x,
  y,
  w,
  h,
  color,
  label,
  value,
  align = "bottom",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  label?: string;
  value?: string;
  align?: "bottom" | "top";
}) {
  const top = align === "bottom" ? y - h : y;
  return (
    <>
      <rect x={x} y={top} width={w} height={Math.max(h, 1)} fill="none" stroke={color} strokeWidth={2} />
      {value && (
        <text
          x={x + w / 2}
          y={align === "bottom" ? top - 10 : top + h + 22}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={13}
          fill={color}
        >
          {value}
        </text>
      )}
      {label && (
        <text
          x={x + w / 2}
          y={align === "bottom" ? y + 22 : y - 10}
          textAnchor="middle"
          fontFamily="Archivo, sans-serif"
          fontSize={12}
          fill={MUTE}
        >
          {label}
        </text>
      )}
    </>
  );
}

const fmt = (usd: number) => (usd >= 0.01 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(5)}`);

export const QueryCostFilm: React.FC<{ cloud?: CloudId }> = ({ cloud = "gcp" }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  const cost = useMemo(() => queryCost(cloud), [cloud]);
  const oss = useMemo(() => queryCost("oss"), []);
  const maxTokens = Math.max(...cost.segments.map((s) => s.tokens));
  const maxUsd = Math.max(...cost.segments.map((s) => s.usd));

  const BASE_Y = height - 150;
  const COL_W = 124;
  const GAP = 62;
  const left = (width - (cost.segments.length * (COL_W + GAP) - GAP)) / 2;
  const MAX_BAR = 430;

  // Beat 1 — the request assembles, one segment at a time.
  const assembleAt = (i: number) => ease(interpolate(t, [0.6 + i * 0.9, 1.9 + i * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  // Beat 2 — the money skyline rises behind it.
  const moneyAt = (i: number) => ease(interpolate(t, [BEATS.compare[0] + 0.4 + i * 0.5, BEATS.compare[0] + 1.8 + i * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const escalate = ease(interpolate(t, [BEATS.escalate[0] + 0.5, BEATS.escalate[0] + 2.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const selfHost = ease(interpolate(t, [BEATS.selfHost[0] + 0.3, BEATS.selfHost[0] + 1.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  const inBeat = (b: readonly [number, number]) => t >= b[0] && t < b[1];

  const kicker = inBeat(BEATS.assemble)
    ? { text: "01 · What you send", sub: "A question is the smallest part of the request." }
    : inBeat(BEATS.compare)
      ? { text: "02 · What you pay", sub: `The answer is ${Math.round((cost.segments[4].usd / cost.totalUsd) * 100)}% of the bill.` }
      : inBeat(BEATS.escalate)
        ? { text: "03 · If it escalates", sub: `A reasoning tier multiplies the output ${cost.reasoningMultiplier}×.` }
        : { text: "04 · Self-hosted", sub: "Tokens stop being the meter." };

  return (
    <div style={{ width, height, background: GROUND, position: "relative", fontFamily: "Archivo, sans-serif" }}>
      <Kicker text={kicker.text} sub={kicker.sub} />

      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {/* Ground rule */}
        <line x1={64} y1={BASE_Y} x2={width - 64} y2={BASE_Y} stroke={INK} strokeWidth={2} />

        {cost.segments.map((s, i) => {
          const x = left + i * (COL_W + GAP);
          const tokH = (s.tokens / maxTokens) * MAX_BAR * assembleAt(i);

          // Money bars grow from the same baseline, drawn inset so the two
          // readings sit side by side rather than on top of one another.
          const usdBase = inBeat(BEATS.escalate) || t >= BEATS.escalate[0] ? s.usd * (s.side === "output" ? 1 + (cost.reasoningMultiplier - 1) * escalate : 1) : s.usd;
          const usdScale = Math.max(maxUsd, s.side === "output" ? maxUsd * cost.reasoningMultiplier : maxUsd);
          const usdH = (usdBase / usdScale) * MAX_BAR * moneyAt(i) * (1 - selfHost);

          return (
            <g key={s.id}>
              <Bar
                x={x}
                y={BASE_Y}
                w={COL_W * 0.46}
                h={tokH}
                color={INK}
                label={i === 0 ? "tokens" : undefined}
                value={assembleAt(i) > 0.9 ? s.tokens.toLocaleString() : undefined}
              />
              <Bar
                x={x + COL_W * 0.54}
                y={BASE_Y}
                w={COL_W * 0.46}
                h={usdH}
                color={ACCENT}
                label={i === 0 && moneyAt(0) > 0.5 ? "cost" : undefined}
                value={moneyAt(i) > 0.9 && !inBeat(BEATS.selfHost) ? fmt(usdBase) : undefined}
              />
              <text
                x={x + COL_W / 2}
                y={BASE_Y + 46}
                textAnchor="middle"
                fontFamily="Archivo, sans-serif"
                fontSize={13}
                fontWeight={600}
                fill={assembleAt(i) > 0.5 ? INK : "transparent"}
              >
                {s.label.replace("The question itself", "Question").replace("Embed the question", "Embed")}
              </text>
            </g>
          );
        })}

        {/* Self-hosted plate: the money side is replaced by a statement, not a
            number, because there is no per-token price to quote. */}
        {selfHost > 0.01 && (
          <g opacity={selfHost}>
            <rect
              x={width / 2 - 300}
              y={BASE_Y - 250}
              width={600}
              height={130}
              fill={GROUND}
              stroke={ACCENT}
              strokeWidth={2}
            />
            <text x={width / 2} y={BASE_Y - 200} textAnchor="middle" fontFamily="Archivo, sans-serif" fontWeight={800} fontSize={26} fill={INK}>
              ${oss.gpuHourUsd}/GPU-hour
            </text>
            <text x={width / 2} y={BASE_Y - 168} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize={14} fill={MUTE}>
              same tokens · no per-token price · cost depends on utilisation
            </text>
          </g>
        )}
      </svg>

      {/* Provenance, always on screen — the film is only worth anything if the
          numbers are checkable. */}
      <div
        style={{
          position: "absolute",
          left: 64,
          bottom: 42,
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          color: MUTE,
        }}
      >
        {cost.model} · list prices verified {cost.verifiedOn} · claim {cost.claimId}
      </div>
      <div
        style={{
          position: "absolute",
          right: 64,
          bottom: 42,
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          color: MUTE,
        }}
      >
        one query · {cost.totalTokens.toLocaleString()} tokens
      </div>
    </div>
  );
};

export const FILM_CLOUDS = ALL_CLOUDS;
