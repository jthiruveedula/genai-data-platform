/**
 * Client controller for the scroll-driven platform page.
 *
 * One `requestAnimationFrame` tick reads scroll geometry and writes
 * transforms straight to elements held by ref — no framework re-render per
 * frame. The five pieces of UI state (`cloud`, `stage`, `agent`, `sys`,
 * `tier`) patch only the nodes that depend on them; `cloud` in particular is
 * one value threaded through derived lookups, not per-section state.
 */
import {
  AGENT,
  CLOUD_NAMES,
  FLAVORS,
  HERO_STACK,
  MAPPINGS,
  STAGES,
  SYSTEMS,
  TIERS,
} from "../../data/platformScroll";
import { drawStage } from "./lifecycle-scenes";
import { createHeroScene } from "./hero-gl";

const ACCENT_VAR = "var(--color-accent)";
const INK_VAR = "var(--color-text)";
const MUTE_VAR = "var(--color-neutral-700)";
const LINE_VAR = "var(--color-neutral-300)";

const cssVar = (n: string, fb: string) =>
  (getComputedStyle(document.documentElement).getPropertyValue(n) || "").trim() || fb;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Drives the per-cloud accent block in `platform.css`; index matches `cloud`. */
const CLOUD_SLUGS = ["", "gcp", "aws", "azure", "oss"];

/** Scroll progress of a pinned section: 0 as it pins, 1 as it releases. */
function progress(el: Element | null) {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  if (span <= 0) return r.top < 0 ? 1 : 0;
  return clamp01(-r.top / span);
}

export function mountPlatform(root: HTMLElement) {
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const qa = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

  let accent = cssVar("--color-accent", "#ec3013");
  const ink = cssVar("--color-text", "#201e1d");
  const ground = cssVar("--color-bg", "#f3f2f2");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = { cloud: 1, stage: 0, agent: 0, sys: 0, tier: 1 };
  /** Latches auto-run off for good once the visitor drives the loop. */
  let userPicked = false;

  // — refs —————————————————————————————————————————————————————————————
  const heroEl = q(".pf-hero");
  const heroCopy = q(".pf-hero__copy");
  const heroPhase = q("[data-pf-hero-phase]");
  const heroStack = q("[data-pf-hero-stack]");
  const heroCanvasHost = q(".pf-hero__canvas");
  const pipeLabels = qa("[data-pf-pipe-label]");
  const meter = q("[data-pf-meter]");

  const cloudBtns = qa<HTMLButtonElement>("[data-pf-cloud]");

  const lifeEl = q(".pf-life");
  const lifeNum = q("[data-pf-life-num]");
  const lifeName = q("[data-pf-life-name]");
  const lifeDesc = q("[data-pf-life-desc]");
  const lifeOnLabel = q("[data-pf-life-onlabel]");
  const lifeStack = q("[data-pf-life-stack]");
  const lifePhase = q("[data-pf-life-phase]");
  const lifeTicks = qa("[data-pf-life-tick]");
  const lifeStrip = q("[data-pf-life-strip]");
  const lifeCards = qa("[data-pf-life-card]");
  const lifeCanvas = q<HTMLCanvasElement>("[data-pf-life-canvas]");

  const agentRows = qa<HTMLButtonElement>("[data-pf-agent-row]");
  const agentStacks = qa("[data-pf-agent-stack]");
  const loopEl = q(".pf-loop");
  const loopPlane = q("[data-pf-loop-plane]");
  const loopNodes = qa("[data-pf-loop-node]");
  const loopShorts = qa("[data-pf-loop-short]");
  const iterEl = q("[data-pf-iter]");
  const iterBar = q("[data-pf-iter-bar]");
  const iterNote = q("[data-pf-iter-note]");

  const sysBtns = qa<HTMLButtonElement>("[data-pf-sys]");
  const callEl = q("[data-pf-call]");

  const flavorBtns = qa<HTMLButtonElement>("[data-pf-flavor]");
  const flavorStates = qa("[data-pf-flavor-state]");
  const mapValues = qa("[data-pf-map-value]");

  const curEl = q(".pf-cur");
  const curTrack = q("[data-pf-cur-track]");
  const curCards = qa("[data-pf-cur-card]");
  const curProgress = q("[data-pf-cur-progress]");
  const curCount = q("[data-pf-cur-count]");

  const costRows = qa("[data-pf-cost-row]");

  const tierBtns = qa<HTMLButtonElement>("[data-pf-tier]");
  const tierNote = q("[data-pf-tiernote]");

  const statsEl = q(".pf-stats");
  const statVals = qa("[data-pf-stat]");

  // — derived renders ——————————————————————————————————————————————————
  function renderCloud() {
    const c = state.cloud;
    cloudBtns.forEach((b, i) => b.classList.toggle("is-active", c === i + 1));
    if (heroStack) heroStack.textContent = HERO_STACK[c];
    if (lifeOnLabel) lifeOnLabel.textContent = "ON " + CLOUD_NAMES[c] + " →";
    if (lifeStack) lifeStack.textContent = STAGES[state.stage].stack[c];
    agentStacks.forEach((el, i) => (el.textContent = AGENT[i].stack[c]));
    loopShorts.forEach((el, i) => (el.textContent = AGENT[i].stack[c]));
    flavorBtns.forEach((b, i) => b.classList.toggle("is-active", c === i + 1));
    flavorStates.forEach((el, i) => (el.textContent = c === i + 1 ? "ACTIVE" : FLAVORS[i].short));
    mapValues.forEach((el, i) => (el.textContent = MAPPINGS[i].values[c - 1]));
    costRows.forEach((r, i) => r.classList.toggle("is-active", c === i + 1));
  }

  function renderStage() {
    const st = STAGES[state.stage];
    if (lifeNum) lifeNum.textContent = String(state.stage + 1).padStart(2, "0");
    if (lifeName) lifeName.textContent = st.name;
    if (lifeDesc) lifeDesc.textContent = st.desc;
    if (lifeStack) lifeStack.textContent = st.stack[state.cloud];
    if (lifePhase) lifePhase.textContent = st.tag + " // LIVE";
  }

  function renderAgent() {
    agentRows.forEach((b, i) => b.classList.toggle("is-active", state.agent === i));
    loopNodes.forEach((n, i) => n.classList.toggle("is-active", state.agent === i));
  }

  function renderSys() {
    sysBtns.forEach((b, i) => b.classList.toggle("is-active", state.sys === i));
    if (callEl) callEl.textContent = SYSTEMS[state.sys].call;
  }

  function renderTier() {
    tierBtns.forEach((b, i) => b.classList.toggle("is-active", state.tier === i));
    if (tierNote) tierNote.textContent = TIERS[state.tier].note;
  }

  // — interaction —————————————————————————————————————————————————————
  const setCloud = (i: number) => {
    state.cloud = i;
    // The accent is a token, so CSS re-tints itself; WebGL and Canvas2D can't
    // read `var(--*)`, so they're handed the freshly resolved value.
    document.documentElement.setAttribute("data-pf-cloud", CLOUD_SLUGS[i]);
    accent = cssVar("--color-accent", accent);
    gl?.setAccent(accent);
    renderCloud();
  };
  cloudBtns.forEach((b, i) => b.addEventListener("click", () => setCloud(i + 1)));
  flavorBtns.forEach((b, i) => b.addEventListener("click", () => setCloud(i + 1)));
  agentRows.forEach((b, i) =>
    b.addEventListener("click", () => {
      userPicked = true;
      state.agent = i;
      renderAgent();
    }),
  );
  sysBtns.forEach((b, i) =>
    b.addEventListener("click", () => {
      state.sys = i;
      renderSys();
    }),
  );
  tierBtns.forEach((b, i) =>
    b.addEventListener("click", () => {
      state.tier = i;
      renderTier();
    }),
  );

  // — hero WebGL ———————————————————————————————————————————————————————
  let gl: ReturnType<typeof createHeroScene> | null = null;
  if (heroCanvasHost) {
    gl = createHeroScene(heroCanvasHost, { accent, ink, ground }, reduce);
    window.addEventListener("resize", () => gl?.resize());
  }

  // — hero backdrop: the offline render, shown until the live scene is up ——
  // Poster paints immediately (it is in the markup). The loop is an upgrade,
  // and an upgrade has to earn its bytes: not on a phone, not when the visitor
  // asked for less motion, and never before the page has finished loading.
  const backdropHost = document.querySelector<HTMLElement>("[data-pf-hero-backdrop]");
  if (backdropHost && !reduce && window.matchMedia("(min-width: 861px)").matches) {
    const start = () => {
      const video = document.createElement("video");
      video.className = "pf-hero__loop";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.src = `${import.meta.env.BASE_URL}hero/hero-loop.mp4`;
      // Only reveal once it is actually playing: a black or half-decoded frame
      // over the poster would be worse than the poster alone.
      video.addEventListener("playing", () => video.classList.add("is-playing"), { once: true });
      backdropHost.appendChild(video);
      video.play().catch(() => video.remove());
    };
    if (document.readyState === "complete") window.setTimeout(start, 200);
    else window.addEventListener("load", () => window.setTimeout(start, 200), { once: true });
  }

  // — the one RAF loop ————————————————————————————————————————————————
  let raf = 0;
  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const time = now / 1000;

    const hp = progress(heroEl);

    if (gl) {
      gl.frame(hp, time);
      gl.projectLabels(pipeLabels);
    }

    if (meter) {
      const total = document.documentElement.scrollHeight - window.innerHeight || 1;
      const d = clamp01(window.scrollY / total);
      const tok = Math.round(d * 148320);
      meter.textContent = tok.toLocaleString() + " TOKENS · $" + (tok * 0.0000012).toFixed(4);
      meter.style.display = window.innerWidth > 900 ? "flex" : "none";
      meter.style.color = d > 0.02 ? ACCENT_VAR : MUTE_VAR;
    }

    if (heroCopy) {
      const out = clamp01((hp - 0.1) / 0.3);
      heroCopy.style.opacity = String(1 - out);
      heroCopy.style.transform = "translate3d(" + -out * 60 + "px," + -out * 40 + "px,0)";
      heroCopy.style.pointerEvents = out > 0.5 ? "none" : "";
      heroCopy.style.filter = out > 0 ? "blur(" + (out * 4).toFixed(1) + "px)" : "none";
    }
    if (heroPhase)
      heroPhase.textContent =
        hp < 0.33 ? "PIPELINE // LIVE" : hp < 0.72 ? "RETRIEVAL // ENGAGED" : "AGENT RUNTIME // ARMED";

    if (lifeEl) {
      const p = progress(lifeEl);
      const f = p * (STAGES.length - 0.001);
      const idx = Math.min(STAGES.length - 1, Math.floor(f));
      if (idx !== state.stage) {
        state.stage = idx;
        renderStage();
      }
      if (lifeStrip && lifeCards.length) {
        const cw = (lifeCards[0] as HTMLElement).offsetWidth + 10;
        const view = (lifeStrip.parentElement as HTMLElement).clientWidth;
        lifeStrip.style.transform =
          "translateX(" +
          -Math.max(0, Math.min(cw * lifeCards.length + 40 - view, f * cw - view * 0.32)) +
          "px)";
        lifeCards.forEach((c, i) => {
          const ad = Math.abs(i - f);
          const el = c as HTMLElement;
          // The handoff floors this at 0.3. That fade is visible text at
          // ~1.9:1, which fails AA whether or not the ribbon is exposed to
          // assistive tech — depth reads from translateZ/rotateY instead.
          el.style.opacity = String(Math.max(0.9, 1 - ad * 0.3));
          el.style.borderColor = ad < 0.6 ? ACCENT_VAR : INK_VAR;
          el.style.transform = "translateZ(" + -ad * 40 + "px) rotateY(" + (i - f) * -4 + "deg)";
        });
      }
      lifeTicks.forEach((el, i) => {
        (el as HTMLElement).style.background = i <= idx ? ACCENT_VAR : LINE_VAR;
      });
      if (lifeCanvas) {
        const r = lifeCanvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio, 2);
        if (
          lifeCanvas.width !== Math.round(r.width * dpr) ||
          lifeCanvas.height !== Math.round(r.height * dpr)
        ) {
          lifeCanvas.width = Math.round(r.width * dpr);
          lifeCanvas.height = Math.round(r.height * dpr);
        }
        const ctx = lifeCanvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          // Reduced motion freezes scene time at a legible mid-state; the
          // stage index still tracks scroll so the story stays navigable.
          drawStage(ctx, idx, f - idx, reduce ? 3.4 : time, r.width, r.height, accent);
        }
      }
    }

    if (loopEl) {
      const r = loopEl.getBoundingClientRect();
      const v = Math.max(
        -1,
        Math.min(1, (window.innerHeight / 2 - (r.top + r.height / 2)) / window.innerHeight),
      );
      const fit = Math.max(0.42, Math.min(1, (r.width - 48) / 680));
      if (loopPlane)
        loopPlane.style.transform =
          "rotateX(" +
          v * 16 +
          "deg) rotateZ(" +
          v * -3 +
          "deg) scale(" +
          (fit * (0.92 + (1 - Math.abs(v)) * 0.08)).toFixed(3) +
          ")";
      const visible = r.top < window.innerHeight && r.bottom > 0;
      if (visible && !userPicked && !reduce) {
        const cyc = (time / 1.6) % 13;
        const step = Math.floor(cyc) % 3;
        if (step !== state.agent) {
          state.agent = step;
          renderAgent();
        }
        const iter = Math.min(4, Math.floor(cyc / 3) + 1);
        const done = cyc > 12;
        if (iterEl) {
          iterEl.textContent = done ? "4" : String(iter);
          iterEl.style.color = done ? ACCENT_VAR : INK_VAR;
        }
        if (iterBar) iterBar.style.width = (done ? 100 : iter * 25) + "%";
        if (iterNote)
          iterNote.textContent = done
            ? "BUDGET REACHED — THE LOOP STOPS, IT DOESN’T RUN FOREVER"
            : "PLAN → TOOL CALL → OBSERVE — CAPPED ITERATION BUDGET";
      }
    }

    if (curEl) {
      const p = progress(curEl);
      if (curTrack && curCards.length) {
        const cw = (curCards[0] as HTMLElement).offsetWidth + 26;
        const total = cw * curCards.length;
        const view = (curTrack.parentElement as HTMLElement).clientWidth;
        const shift = Math.max(0, total - view + 100) * p;
        curTrack.style.transform = "translateX(" + -shift + "px)";
        const focus = p * (curCards.length - 1);
        curCards.forEach((c, i) => {
          const d = i - focus,
            ad = Math.abs(d);
          const el = c as HTMLElement;
          el.style.transform =
            "translateZ(" + -ad * 130 + "px) rotateY(" + d * -8 + "deg) translateY(" + ad * 12 + "px)";
          // The handoff floors this at 0.22. These cards are links to real
          // module pages — a faded link is still tabbable, so its text has to
          // clear AA at rest. Depth reads from translateZ/rotateY/translateY
          // instead; the fade only takes the edge off the furthest cards.
          el.style.opacity = String(Math.max(0.9, 1 - ad * 0.26));
          el.style.borderColor = ad < 0.5 ? ACCENT_VAR : INK_VAR;
        });
        if (curProgress) curProgress.style.width = p * 100 + "%";
        if (curCount)
          curCount.textContent = String(Math.min(12, Math.round(focus) + 1)).padStart(2, "0") + " / 12";
      }
    }

    if (statsEl) {
      const r = statsEl.getBoundingClientRect();
      const v = clamp01((window.innerHeight * 0.95 - r.top) / (window.innerHeight * 0.5));
      statVals.forEach((el) => {
        const target = parseFloat(el.getAttribute("data-target") || "0") || 0;
        el.textContent =
          (el.getAttribute("data-prefix") || "") +
          Math.round(target * v) +
          (el.getAttribute("data-suffix") || "");
      });
    }
  }

  renderCloud();
  renderStage();
  renderAgent();
  renderSys();
  renderTier();
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    gl?.dispose();
  };
}
