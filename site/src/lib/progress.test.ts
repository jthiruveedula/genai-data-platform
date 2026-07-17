import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readQuizScore, isModuleComplete, getCompletionSummary, nextIncompleteModule } from './progress';

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

  describe('readQuizScore', () => {
    it('returns null when no score is stored', () => {
      expect(readQuizScore('00-foundations')).toBeNull();
    });

    it('returns the parsed score when valid', () => {
      store.set('gdp.quiz.00-foundations', JSON.stringify({ score: 4, total: 5, completedAt: 123 }));
      expect(readQuizScore('00-foundations')).toEqual({ score: 4, total: 5, completedAt: 123 });
    });

    it('returns null for malformed JSON', () => {
      store.set('gdp.quiz.00-foundations', 'not json');
      expect(readQuizScore('00-foundations')).toBeNull();
    });

    it('returns null when total is zero or missing', () => {
      store.set('gdp.quiz.00-foundations', JSON.stringify({ score: 0, total: 0 }));
      expect(readQuizScore('00-foundations')).toBeNull();
    });
  });

  describe('isModuleComplete', () => {
    it('is false with no recorded score', () => {
      expect(isModuleComplete('00-foundations')).toBe(false);
    });

    it('is true at or above the pass threshold (0.7)', () => {
      store.set('gdp.quiz.00-foundations', JSON.stringify({ score: 4, total: 5, completedAt: 1 })); // 0.8
      expect(isModuleComplete('00-foundations')).toBe(true);
    });

    it('is false below the pass threshold', () => {
      store.set('gdp.quiz.00-foundations', JSON.stringify({ score: 3, total: 5, completedAt: 1 })); // 0.6
      expect(isModuleComplete('00-foundations')).toBe(false);
    });
  });

  describe('getCompletionSummary', () => {
    it('counts only modules meeting the pass threshold', () => {
      store.set('gdp.quiz.a', JSON.stringify({ score: 5, total: 5, completedAt: 1 }));
      store.set('gdp.quiz.b', JSON.stringify({ score: 1, total: 5, completedAt: 1 }));
      expect(getCompletionSummary(['a', 'b', 'c'])).toEqual({ completed: 1, total: 3 });
    });
  });

  describe('nextIncompleteModule', () => {
    it('returns the first module without a passing score', () => {
      store.set('gdp.quiz.a', JSON.stringify({ score: 5, total: 5, completedAt: 1 }));
      expect(nextIncompleteModule(['a', 'b', 'c'])).toBe('b');
    });

    it('returns null when every module is complete', () => {
      store.set('gdp.quiz.a', JSON.stringify({ score: 5, total: 5, completedAt: 1 }));
      store.set('gdp.quiz.b', JSON.stringify({ score: 5, total: 5, completedAt: 1 }));
      expect(nextIncompleteModule(['a', 'b'])).toBeNull();
    });
  });
});
