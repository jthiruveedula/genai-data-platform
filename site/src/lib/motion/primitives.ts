/**
 * GSAP motion primitives (redesign spec §4.3).
 *
 * These factor out the ad-hoc GSAP patterns already in use around the site —
 * CloudSelector.astro's card entrance (`gsap.from` with autoAlpha/y/power2.out,
 * staggered) and BaseLayout.astro's ScrollTrigger reveal-on-scroll for
 * `article > *` / `.module-list li` — into reusable, reduced-motion-safe
 * helpers. Nothing currently imports this module: CloudSelector.astro and
 * BaseLayout.astro keep their own inline GSAP code for now (that rewiring is
 * the Hero workstream's job, running in parallel).
 *
 * Every primitive checks `window.matchMedia("(prefers-reduced-motion: reduce)")`
 * directly so that under reduced motion the target element(s) are simply set
 * to their final, visible state with no animation — mirroring the
 * `if (reduceMotion) { ...skip to end state... }` guard already used in both
 * CloudSelector.astro and BaseLayout.astro. Deliberately NOT using
 * `gsap.matchMedia().add({name: query}, callback)`: verified against the
 * installed gsap 3.15.0 that its callback only fires when a named condition
 * currently evaluates true, so a `false` condition (the common case — most
 * visitors have no reduced-motion preference) silently never invokes the
 * callback at all.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type GSAPTarget = gsap.TweenTarget;

export interface FadeInOptions {
  /** Vertical offset (px) the element rises from. Default 16, matching
   *  BaseLayout.astro's `article > *` reveal. */
  y?: number;
  duration?: number;
  ease?: string;
  delay?: number;
}

export interface StaggerOptions extends FadeInOptions {
  /** Delay (s) between each element's tween start. Default 0.08, matching
   *  BaseLayout.astro's `.module-list li` stagger. */
  stagger?: number;
}

export interface ScrollRevealOptions extends FadeInOptions {
  /** ScrollTrigger `start` value. Default "top 90%", matching
   *  BaseLayout.astro's `article > *` trigger. */
  start?: string;
  /** Whether the reveal should only fire once. Default true. */
  once?: boolean;
}

/**
 * Fade + rise an element into view: `autoAlpha` 0 → 1, `y` offset → 0.
 * Mirrors the `gsap.from(cards, { autoAlpha: 0, y: 16, duration: 0.5,
 * ease: "power2.out" })` pattern in CloudSelector.astro.
 * No-ops (jumps straight to the visible end state) under
 * prefers-reduced-motion.
 */
export function fadeIn(el: GSAPTarget, opts: FadeInOptions = {}): gsap.core.Tween | void {
  const { y = 16, duration = 0.5, ease = "power2.out", delay = 0 } = opts;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set(el, { autoAlpha: 1, y: 0 });
    return;
  }
  return gsap.from(el, { autoAlpha: 0, y, duration, ease, delay });
}

/**
 * Fade + rise a group of elements into view, staggered.
 * Mirrors `gsap.from(cards, { ..., stagger: 0.06, delay: 0.3 })`
 * (CloudSelector.astro) and `gsap.from(moduleListItems, { ..., stagger: 0.08 })`
 * (BaseLayout.astro). No-ops under prefers-reduced-motion.
 */
export function stagger(els: GSAPTarget, opts: StaggerOptions = {}): gsap.core.Tween | void {
  const { y = 16, duration = 0.5, ease = "power2.out", delay = 0, stagger: staggerAmount = 0.08 } = opts;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set(els, { autoAlpha: 1, y: 0 });
    return;
  }
  return gsap.from(els, { autoAlpha: 0, y, duration, ease, delay, stagger: staggerAmount });
}

/**
 * Scroll-triggered reveal: fades/rises an element in once it crosses into
 * the viewport. Mirrors BaseLayout.astro's
 * `scrollTrigger: { trigger: el, start: "top 90%", once: true }` reveal.
 * No-ops under prefers-reduced-motion (element is left in its final state).
 */
export function scrollReveal(el: GSAPTarget, opts: ScrollRevealOptions = {}): gsap.core.Tween | void {
  const { y = 16, duration = 0.5, ease = "power2.out", delay = 0, start = "top 90%", once = true } = opts;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set(el, { autoAlpha: 1, y: 0 });
    return;
  }
  return gsap.from(el, {
    autoAlpha: 0,
    y,
    duration,
    ease,
    delay,
    scrollTrigger: { trigger: el as gsap.DOMTarget, start, once },
  });
}

export interface MagneticHoverOptions {
  duration?: number;
  ease?: string;
}

/**
 * Subtle magnetic-hover effect: on pointer move over `el`, nudges it toward
 * the cursor by up to `strength` px; resets on pointer leave. Returns a
 * cleanup function that removes the listeners. No-ops (listeners are never
 * attached, element never moves) under prefers-reduced-motion.
 */
export function magneticHover(el: HTMLElement, strength = 12, opts: MagneticHoverOptions = {}): () => void {
  const { duration = 0.3, ease = "power2.out" } = opts;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }

  const onMove = (e: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(el, { x: relX * strength, y: relY * strength, duration, ease });
  };
  const onLeave = () => {
    gsap.to(el, { x: 0, y: 0, duration, ease });
  };

  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);

  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
  };
}

export interface ShimmerOptions {
  duration?: number;
  ease?: string;
  repeat?: number;
}

/**
 * Looping shimmer sweep (e.g. loading-skeleton highlight), driven by a
 * background-position tween. No-ops under prefers-reduced-motion (element
 * is left static, no repeating animation is started).
 */
export function shimmer(el: GSAPTarget, opts: ShimmerOptions = {}): gsap.core.Tween | void {
  const { duration = 1.2, ease = "sine.inOut", repeat = -1 } = opts;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  return gsap.fromTo(el, { backgroundPosition: "200% 0" }, { backgroundPosition: "-200% 0", duration, ease, repeat });
}
