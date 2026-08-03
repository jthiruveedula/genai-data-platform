// Per-stage micro-animations for the lifecycle section: what actually happens
// to the data at each of the ten stages. Pure canvas 2D, ink + one accent.
//
// Ported from the design handoff's `lifecycle-scenes.js` — Canvas2D can't read
// `var(--*)`, so the ink/ground tokens are resolved from the document once at
// module load and alpha-composited through `hexA()`; no `rgba()` literals and
// no hard-coded hexes beyond the fallbacks.
type Ctx = CanvasRenderingContext2D;

const tok = (n: string, fb: string) =>
  (getComputedStyle(document.documentElement).getPropertyValue(n) || "").trim() || fb;
const INK = tok("--color-text", "#201e1d");
const GROUND = tok("--color-bg", "#f3f2f2");
const hexA = (c: string, a: number) =>
  /^#[0-9a-f]{6}$/i.test(c) ? c + Math.round(a * 255).toString(16).padStart(2, "0") : c;
const MUTE = hexA(INK, 0.32);

function seeded(i: number) {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));

function plate(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  lines: number,
  accent: string,
  mark: boolean,
) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.fillStyle = GROUND;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 2;
  ctx.strokeStyle = MUTE;
  for (let i = 0; i < lines; i++) {
    const ly = y + 14 + i * ((h - 22) / lines);
    ctx.beginPath();
    ctx.moveTo(x + 10, ly);
    ctx.lineTo(x + w - 10 - (i % 3) * w * 0.16, ly);
    ctx.stroke();
  }
  if (mark) {
    ctx.fillStyle = accent;
    ctx.fillRect(x + w - 16, y + 8, 8, 8);
  }
}

function label(ctx: Ctx, x: number, y: number, text: string, color: string, size?: number) {
  ctx.fillStyle = color;
  ctx.font = "700 " + (size || 10) + "px Archivo, sans-serif";
  ctx.letterSpacing = "0.14em";
  ctx.fillText(text, x, y);
  ctx.letterSpacing = "0em";
}

type Scene = (c: Ctx, t: number, w: number, h: number, a: string) => void;

const scenes: Scene[] = [
  // 01 SOURCES — heterogeneous documents arriving
  function (c, t, w, h, a) {
    const kinds = ["PDF", "TICKET", "CRAWL", "CHAT"];
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.16 + i * 0.25) % 1;
      const x = w * (1.05 - p * 1.25),
        y = h * (0.2 + i * 0.17) + Math.sin(t * 1.1 + i) * 6;
      c.save();
      c.globalAlpha = Math.min(1, p * 3) * Math.min(1, (1 - p) * 4);
      c.translate(x, y);
      c.rotate((seeded(i) - 0.5) * 0.16);
      plate(c, 0, 0, 150, 96, 5, a, i === 0);
      label(c, 4, -8, kinds[i], i === 0 ? a : MUTE);
      c.restore();
    }
  },
  // 02 INGEST — rows landing in object storage, scanned
  function (c, t, w, h, a) {
    const rows = 9,
      bx = w * 0.14,
      bw = w * 0.72,
      top = h * 0.16,
      rh = (h * 0.66) / rows;
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.strokeRect(bx, top, bw, rh * rows);
    for (let i = 0; i < rows; i++) {
      const fill = (t * 0.9) % (rows + 3) > i;
      c.strokeStyle = MUTE;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(bx, top + rh * (i + 1));
      c.lineTo(bx + bw, top + rh * (i + 1));
      c.stroke();
      if (fill) {
        c.fillStyle = i % 4 === 1 ? a : hexA(INK, 0.14);
        c.fillRect(bx + 8, top + rh * i + rh * 0.28, bw * (0.3 + seeded(i) * 0.6) - 16, rh * 0.44);
      }
    }
    const sy = top + ((t * 0.9) % (rows + 3)) * rh;
    if (sy < top + rh * rows) {
      c.strokeStyle = a;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(bx, sy);
      c.lineTo(bx + bw, sy);
      c.stroke();
    }
    label(c, bx, top - 10, "OBJECT STORAGE + METADATA", MUTE);
  },
  // 03 PARSE + CHUNK — one page cut at semantic boundaries
  function (c, t, w, h, a) {
    const n = 5,
      bx = w * 0.2,
      bw = w * 0.6,
      top = h * 0.14,
      ph = h * 0.7,
      ch = ph / n;
    const open = ease(((t * 0.5) % 2.4) / 1.2) * 14;
    for (let i = 0; i < n; i++) {
      const y = top + i * ch + (i - (n - 1) / 2) * open;
      plate(c, bx, y, bw, ch - 4, 2, a, false);
      c.strokeStyle = a;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(bx - 12, y);
      c.lineTo(bx - 2, y);
      c.stroke();
      label(c, bx + bw + 10, y + 14, "CHUNK " + (i + 1), MUTE);
    }
  },
  // 04 EMBED — chunks collapse into vectors
  function (c, t, w, h, a) {
    const n = 5,
      p = ease(((t * 0.55) % 2.6) / 1.4);
    const cx = w * 0.66,
      top = h * 0.2,
      ch = (h * 0.6) / n;
    for (let i = 0; i < n; i++) {
      const y = top + i * ch,
        sx = w * 0.12,
        sw = w * 0.3;
      const x = sx + (cx - sx) * p,
        ww = sw * (1 - p) + 8 * p;
      c.strokeStyle = p > 0.85 ? a : INK;
      c.lineWidth = 2;
      c.fillStyle = GROUND;
      c.fillRect(x, y, ww, ch - 8);
      c.strokeRect(x, y, ww, ch - 8);
      if (p > 0.4) {
        c.strokeStyle = hexA(INK, 0.2);
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x + ww, y + ch / 2 - 4);
        c.lineTo(cx + 40, y + ch / 2 - 4);
        c.stroke();
      }
    }
    c.font = "600 11px ui-monospace, monospace";
    c.fillStyle = MUTE;
    for (let i = 0; i < 5; i++) {
      const v = Math.sin(t * 1.6 + i * 2.1).toFixed(3);
      c.fillText("[" + (v[0] === "-" ? "" : " ") + v + " …]", cx + 52, h * 0.24 + i * ((h * 0.6) / 5));
    }
    label(c, w * 0.12, h * 0.16, "CHUNKS", MUTE);
    label(c, cx + 52, h * 0.16, "768-DIM VECTORS", a);
  },
  // 05 VECTOR DB — vectors settle into clusters
  function (c, t, w, h, a) {
    const p = ease(((t * 0.4) % 3) / 1.6);
    const cores = [
      [0.28, 0.34],
      [0.62, 0.28],
      [0.5, 0.72],
      [0.8, 0.6],
    ];
    for (let i = 0; i < 150; i++) {
      const k = cores[i % 4];
      const rx = seeded(i) - 0.5,
        ry = seeded(i + 99) - 0.5;
      const sx = 0.5 + rx * 0.9,
        sy = 0.5 + ry * 0.9;
      const tx = k[0] + rx * 0.13,
        ty = k[1] + ry * 0.13;
      const x = (sx + (tx - sx) * p) * w,
        y = (sy + (ty - sy) * p) * h;
      c.fillStyle = i % 11 === 0 ? a : hexA(INK, 0.55);
      c.fillRect(x, y, 3.5, 3.5);
    }
    if (p > 0.6) {
      c.strokeStyle = hexA(INK, 0.25);
      c.lineWidth = 1;
      cores.forEach((k) => c.strokeRect((k[0] - 0.16) * w, (k[1] - 0.17) * h, 0.32 * w, 0.34 * h));
    }
    label(c, 16, 22, "SIMILAR MEANINGS CLUSTER", MUTE);
  },
  // 06 RETRIEVE — query drops in, nearest neighbours light up
  function (c, t, w, h, a) {
    const pts: [number, number][] = [];
    for (let i = 0; i < 130; i++) pts.push([seeded(i) * w, seeded(i + 50) * h]);
    const qx = w * 0.5 + Math.cos(t * 0.5) * w * 0.12,
      qy = h * 0.5 + Math.sin(t * 0.42) * h * 0.14;
    const scored = pts
      .map((p): [[number, number], number] => [p, Math.hypot(p[0] - qx, p[1] - qy)])
      .sort((m, n) => m[1] - n[1]);
    pts.forEach((p) => {
      c.fillStyle = hexA(INK, 0.35);
      c.fillRect(p[0], p[1], 3, 3);
    });
    const k = (t * 1.4) % 9 | 0;
    scored.slice(0, 6).forEach((s, i) => {
      if (i > k) return;
      c.strokeStyle = a;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(qx, qy);
      c.lineTo(s[0][0] + 1.5, s[0][1] + 1.5);
      c.stroke();
      c.fillStyle = a;
      c.fillRect(s[0][0] - 3, s[0][1] - 3, 9, 9);
    });
    const r = ((t * 0.6) % 1) * Math.min(w, h) * 0.5;
    c.strokeStyle = hexA(a, 0.5 - (r / (Math.min(w, h) * 0.5)) * 0.5);
    c.lineWidth = 2;
    c.strokeRect(qx - r, qy - r, r * 2, r * 2);
    c.fillStyle = INK;
    c.fillRect(qx - 5, qy - 5, 10, 10);
    label(c, qx + 12, qy - 8, "QUERY", INK);
    label(c, 16, 22, "TOP-K · DENSE + KEYWORD", MUTE);
  },
  // 07 RERANK — candidates re-ordered by a cross-encoder
  function (c, t, w, h, a) {
    const n = 6,
      bx = w * 0.12,
      bw = w * 0.68,
      top = h * 0.18,
      rh = (h * 0.64) / n;
    const phase = (t * 0.5) % 2,
      sw = ease(phase > 1 ? 1 : phase);
    const order = [3, 0, 5, 1, 4, 2];
    for (let i = 0; i < n; i++) {
      const from = i,
        to = order.indexOf(i);
      const y = top + (from + (to - from) * sw) * rh;
      const score = 0.42 + (1 - to / n) * 0.55;
      c.strokeStyle = to === 0 ? a : INK;
      c.lineWidth = 2;
      c.fillStyle = GROUND;
      c.fillRect(bx, y, bw, rh - 8);
      c.strokeRect(bx, y, bw, rh - 8);
      c.fillStyle = to === 0 ? a : hexA(INK, 0.16);
      c.fillRect(bx + 2, y + 2, (bw - 4) * score, rh - 12);
      label(c, bx + 12, y + rh * 0.58, "CHUNK " + String(i + 1).padStart(2, "0"), to === 0 ? GROUND : INK, 11);
      c.font = "600 11px ui-monospace, monospace";
      c.fillStyle = MUTE;
      c.fillText(score.toFixed(2), bx + bw + 12, y + rh * 0.58);
    }
    label(c, bx, top - 12, "CROSS-ENCODER RELEVANCE", MUTE);
  },
  // 08 ASSEMBLE — prompt built with pinned citations
  function (c, t, w, h, a) {
    const bx = w * 0.14,
      bw = w * 0.66,
      top = h * 0.14,
      rows = 11,
      rh = (h * 0.7) / rows;
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.fillStyle = GROUND;
    c.fillRect(bx, top, bw, rh * rows);
    c.strokeRect(bx, top, bw, rh * rows);
    const built = (t * 1.6) % (rows + 4);
    for (let i = 0; i < rows; i++) {
      if (i > built) break;
      const isCite = i % 4 === 3;
      c.fillStyle = isCite ? a : hexA(INK, 0.3);
      c.fillRect(bx + 12, top + rh * i + rh * 0.34, (bw - 40) * (0.4 + seeded(i) * 0.55), rh * 0.32);
      if (isCite) {
        c.fillStyle = a;
        c.fillRect(bx + bw + 10, top + rh * i + rh * 0.24, 22, rh * 0.5);
      }
    }
    label(c, bx, top - 10, "PROMPT + CITATION PINS", MUTE);
    label(c, bx + bw + 10, top - 10, "SRC", a);
  },
  // 09 LLM — attention grid + token stream
  function (c, t, w, h, a) {
    const g = 10,
      gs = Math.min(w, h) * 0.042,
      gx = w * 0.1,
      gy = h * 0.2;
    for (let i = 0; i < g; i++)
      for (let j = 0; j <= i; j++) {
        const v = (Math.sin(t * 2 + i * 0.7 + j * 1.3) + 1) / 2;
        c.fillStyle = v > 0.72 ? a : hexA(INK, 0.08 + v * 0.3);
        c.fillRect(gx + j * gs, gy + i * gs, gs - 2, gs - 2);
      }
    label(c, gx, gy - 12, "CAUSAL ATTENTION", MUTE);
    const tx = w * 0.62,
      n = 14;
    label(c, tx, gy - 12, "TOKENS OUT", a);
    const emitted = (t * 3.4) % (n + 5);
    for (let i = 0; i < n; i++) {
      if (i > emitted) break;
      const y = gy + (i % 7) * (gs + 6),
        x = tx + Math.floor(i / 7) * (w * 0.14);
      c.strokeStyle = INK;
      c.lineWidth = 2;
      c.fillStyle = i === Math.floor(emitted) ? a : GROUND;
      c.fillRect(x, y, w * 0.11, gs);
      c.strokeRect(x, y, w * 0.11, gs);
    }
  },
  // 10 GROUNDED ANSWER — typed answer with traceable citations
  function (c, t, w, h, a) {
    const bx = w * 0.12,
      bw = w * 0.72,
      top = h * 0.2,
      rows = 6,
      rh = (h * 0.5) / rows;
    const typed = (t * 1.1) % (rows + 2.5);
    for (let i = 0; i < rows; i++) {
      const local = Math.max(0, Math.min(1, typed - i));
      if (local <= 0) break;
      const full = (bw - 60) * (0.55 + seeded(i + 7) * 0.45);
      c.fillStyle = hexA(INK, 0.72);
      c.fillRect(bx, top + i * rh, full * local, rh * 0.34);
      if (local === 1) {
        c.fillStyle = a;
        c.fillRect(bx + full + 8, top + i * rh - 2, 16, rh * 0.34);
        label(c, bx + full + 30, top + i * rh + rh * 0.3, "[" + (i + 1) + "]", a, 10);
      }
    }
    c.strokeStyle = INK;
    c.lineWidth = 2;
    const uw = bw * Math.min(1, typed / rows);
    c.beginPath();
    c.moveTo(bx, top + rows * rh + 18);
    c.lineTo(bx + uw, top + rows * rh + 18);
    c.stroke();
    label(c, bx, top - 14, "EVERY CLAIM TRACEABLE", MUTE);
    label(c, bx, top + rows * rh + 42, "TOKENS METERED · EVENT LOGGED", a);
  },
];

export function drawStage(
  ctx: Ctx,
  idx: number,
  local: number,
  t: number,
  w: number,
  h: number,
  accent: string,
) {
  ctx.clearRect(0, 0, w, h);
  const next = Math.min(scenes.length - 1, idx + 1);
  const fade = local > 0.82 ? (local - 0.82) / 0.18 : 0;
  ctx.save();
  ctx.globalAlpha = 1 - fade;
  scenes[idx](ctx, t, w, h, accent);
  ctx.restore();
  if (fade > 0 && next !== idx) {
    ctx.save();
    ctx.globalAlpha = fade;
    scenes[next](ctx, t, w, h, accent);
    ctx.restore();
  }
}
