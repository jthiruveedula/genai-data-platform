import { describe, expect, it } from 'vitest';
import { QUIZZES } from '../data/quizzes';
import { MODULES } from '../data/modules';

// Data-shape smoke test: every module gets a quiz, every quiz question has a
// valid correctIndex and a non-empty explanation (shown on a wrong answer).
describe('QUIZZES', () => {
  it('has a quiz for every registered module', () => {
    for (const mod of MODULES) {
      expect(QUIZZES).toHaveProperty(mod.id);
    }
  });

  it.each(Object.entries(QUIZZES))('%s has well-formed questions', (_moduleId, questions) => {
    expect(questions.length).toBeGreaterThanOrEqual(4);
    for (const q of questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(q.question.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate options within a single question', () => {
    for (const questions of Object.values(QUIZZES)) {
      for (const q of questions) {
        expect(new Set(q.options).size).toBe(q.options.length);
      }
    }
  });
});
