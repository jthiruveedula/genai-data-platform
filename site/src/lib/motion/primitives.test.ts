import { describe, expect, it } from 'vitest';
import { fadeIn, stagger, magneticHover, shimmer, scrollReveal, countUp, drawPath } from './primitives';

describe('motion primitives', () => {
  it('exports fadeIn as a function', () => {
    expect(typeof fadeIn).toBe('function');
  });

  it('exports stagger as a function', () => {
    expect(typeof stagger).toBe('function');
  });

  it('exports magneticHover as a function', () => {
    expect(typeof magneticHover).toBe('function');
  });

  it('exports shimmer as a function', () => {
    expect(typeof shimmer).toBe('function');
  });

  it('exports scrollReveal as a function', () => {
    expect(typeof scrollReveal).toBe('function');
  });

  it('exports countUp as a function', () => {
    expect(typeof countUp).toBe('function');
  });

  it('exports drawPath as a function', () => {
    expect(typeof drawPath).toBe('function');
  });
});

// countUp/drawPath touch `window.matchMedia` and DOM elements immediately on
// call (not just on import, like the plain function-existence checks above),
// so exercising their reduced-motion branch needs a minimal stub environment
// rather than the `environment: 'node'` vitest config's real DOM/jsdom.
describe('countUp (reduced motion)', () => {
  const withReducedMotionStub = (fn: () => void) => {
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      matchMedia: () => ({ matches: true }),
    };
    try {
      fn();
    } finally {
      (globalThis as any).window = originalWindow;
    }
  };

  it('writes the final formatted value immediately and returns nothing', () => {
    withReducedMotionStub(() => {
      const el = { textContent: '' } as unknown as HTMLElement;
      const result = countUp(el, 2483);
      expect(result).toBeUndefined();
      expect(el.textContent).toBe('2,483');
    });
  });

  it('applies prefix, suffix, and decimals', () => {
    withReducedMotionStub(() => {
      const el = { textContent: '' } as unknown as HTMLElement;
      countUp(el, 9.5, { prefix: '<$', suffix: '/mo', decimals: 2, locale: false });
      expect(el.textContent).toBe('<$9.50/mo');
    });
  });
});

describe('drawPath (reduced motion)', () => {
  it('clears dash properties and returns nothing', () => {
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      matchMedia: () => ({ matches: true }),
    };
    const sets: Record<string, unknown>[] = [];
    const fakePath = {
      getTotalLength: () => 120,
      style: {},
    } as unknown as SVGPathElement;

    try {
      const result = drawPath(fakePath);
      expect(result).toBeUndefined();
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });
});
