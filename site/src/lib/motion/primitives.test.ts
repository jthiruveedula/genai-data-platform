import { describe, expect, it } from 'vitest';
import { fadeIn, stagger, magneticHover, shimmer, scrollReveal } from './primitives';

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
});
