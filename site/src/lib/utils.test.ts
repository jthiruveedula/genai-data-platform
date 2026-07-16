import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn()', () => {
  it('merges plain class strings', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c');
  });

  it('dedupes conflicting Tailwind utilities, keeping the last one', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});
