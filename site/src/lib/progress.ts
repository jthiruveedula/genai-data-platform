/**
 * Reads checkpoint-quiz completion out of localStorage (written by
 * ModuleQuiz.astro under the `gdp.quiz.<moduleId>` key). Pure functions only
 * — no DOM access — so this is unit-testable and safe to import from a
 * server-rendered Astro component's frontmatter without touching `window`.
 * Callers that need the live browser value must call these from a
 * client-side <script>, not from Astro's frontmatter.
 */

export interface QuizScore {
  score: number;
  total: number;
  completedAt: number;
}

/** A module counts as "complete" once the last recorded score is >= this. */
export const PASS_THRESHOLD = 0.7;

function storageKey(moduleId: string): string {
  return `gdp.quiz.${moduleId}`;
}

/** Reads the last recorded quiz score for a module, or null if none/invalid. */
export function readQuizScore(moduleId: string): QuizScore | null {
  try {
    const raw = localStorage.getItem(storageKey(moduleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.score !== "number" || typeof parsed.total !== "number" || parsed.total <= 0) return null;
    return parsed as QuizScore;
  } catch {
    return null;
  }
}

/** Whether a module's last recorded score meets the pass threshold. */
export function isModuleComplete(moduleId: string): boolean {
  const result = readQuizScore(moduleId);
  return result ? result.score / result.total >= PASS_THRESHOLD : false;
}

/** Given the site's module ids in curriculum order, returns completion counts. */
export function getCompletionSummary(moduleIds: string[]): { completed: number; total: number } {
  const completed = moduleIds.filter(isModuleComplete).length;
  return { completed, total: moduleIds.length };
}

/** The first module (in the given order) that isn't yet complete, or null if all are. */
export function nextIncompleteModule(moduleIds: string[]): string | null {
  return moduleIds.find((id) => !isModuleComplete(id)) ?? null;
}
