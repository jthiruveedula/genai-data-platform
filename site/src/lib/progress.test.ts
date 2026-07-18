import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readRecapView, markRecapViewed, isModuleComplete, getCompletionSummary, nextIncompleteModule } from './progress';

// vitest runs with `environment: 'node'` (see vitest.config.ts) — no real
// localStorage — so stub a minimal in-memory implementation for these tests,
// matching the pattern already used in primitives.test.ts for window stubs.
function installLocalStorageStub() {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
  return store;
}

describe('progress', () => {
  let store: Map<string, string>;
  const originalLocalStorage = (globalThis as any).localStorage;

  beforeEach(() => {
    store = installLocalStorageStub();
  });

  afterEach(() => {
    (globalThis as any).localStorage = originalLocalStorage;
  });

  describe('readRecapView', () => {
    it('returns null when nothing is stored', () => {
      expect(readRecapView('00-foundations')).toBeNull();
    });

    it('returns the parsed record when valid', () => {
      store.set('gdp.recap.00-foundations', JSON.stringify({ viewedAt: 123 }));
      expect(readRecapView('00-foundations')).toEqual({ viewedAt: 123 });
    });

    it('returns null for malformed JSON', () => {
      store.set('gdp.recap.00-foundations', 'not json');
      expect(readRecapView('00-foundations')).toBeNull();
    });

    it('returns null when viewedAt is missing', () => {
      store.set('gdp.recap.00-foundations', JSON.stringify({}));
      expect(readRecapView('00-foundations')).toBeNull();
    });
  });

  describe('markRecapViewed', () => {
    it('records a view that isModuleComplete then sees', () => {
      expect(isModuleComplete('00-foundations')).toBe(false);
      markRecapViewed('00-foundations');
      expect(isModuleComplete('00-foundations')).toBe(true);
      expect(readRecapView('00-foundations')?.viewedAt).toBeTypeOf('number');
    });
  });

  describe('isModuleComplete', () => {
    it('is false with nothing recorded', () => {
      expect(isModuleComplete('00-foundations')).toBe(false);
    });

    it('honors legacy quiz scores at or above the old pass threshold (0.7)', () => {
      store.set('gdp.quiz.00-foundations', JSON.stringify({ score: 4, total: 5, completedAt: 1 })); // 0.8
      expect(isModuleComplete('00-foundations')).toBe(true);
    });

    it('ignores legacy quiz scores below the threshold', () => {
      store.set('gdp.quiz.00-foundations', JSON.stringify({ score: 3, total: 5, completedAt: 1 })); // 0.6
      expect(isModuleComplete('00-foundations')).toBe(false);
    });

    it('ignores malformed legacy quiz entries', () => {
      store.set('gdp.quiz.00-foundations', JSON.stringify({ score: 1, total: 0 }));
      expect(isModuleComplete('00-foundations')).toBe(false);
    });
  });

  describe('getCompletionSummary', () => {
    it('counts recap views and passing legacy scores together', () => {
      store.set('gdp.recap.a', JSON.stringify({ viewedAt: 1 }));
      store.set('gdp.quiz.b', JSON.stringify({ score: 5, total: 5, completedAt: 1 }));
      store.set('gdp.quiz.c', JSON.stringify({ score: 1, total: 5, completedAt: 1 }));
      expect(getCompletionSummary(['a', 'b', 'c', 'd'])).toEqual({ completed: 2, total: 4 });
    });
  });

  describe('nextIncompleteModule', () => {
    it('returns the first module without a recap view or passing legacy score', () => {
      store.set('gdp.recap.a', JSON.stringify({ viewedAt: 1 }));
      expect(nextIncompleteModule(['a', 'b', 'c'])).toBe('b');
    });

    it('returns null when every module is complete', () => {
      store.set('gdp.recap.a', JSON.stringify({ viewedAt: 1 }));
      store.set('gdp.recap.b', JSON.stringify({ viewedAt: 2 }));
      expect(nextIncompleteModule(['a', 'b'])).toBeNull();
    });
  });
});
