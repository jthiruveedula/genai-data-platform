/**
 * Reads module completion out of localStorage. A module counts as complete
 * once its closing recap has been seen (written by ModuleRecap.astro under
 * the `gdp.recap.<moduleId>` key). Scores recorded by the retired checkpoint
 * quizzes (`gdp.quiz.<moduleId>`) still count, so learners who passed quizzes
 * before the recap redesign keep their progress.
 *
 * Pure functions only — no DOM access — so this is unit-testable and safe to
 * import from a server-rendered Astro component's frontmatter without
 * touching `window`. Callers that need the live browser value must call
 * these from a client-side <script>, not from Astro's frontmatter.
 */

export interface RecapView {
  viewedAt: number;
}

/** Legacy quiz scores at or above this fraction still count as complete. */
export const PASS_THRESHOLD = 0.7;

function recapKey(moduleId: string): string {
  return `gdp.recap.${moduleId}`;
}

function legacyQuizKey(moduleId: string): string {
  return `gdp.quiz.${moduleId}`;
}

/** Reads the recap-view record for a module, or null if none/invalid. */
export function readRecapView(moduleId: string): RecapView | null {
  try {
    const raw = localStorage.getItem(recapKey(moduleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.viewedAt !== "number") return null;
    return parsed as RecapView;
  } catch {
    return null;
  }
}

/** Records that a module's recap has been seen. */
export function markRecapViewed(moduleId: string): void {
  try {
    localStorage.setItem(recapKey(moduleId), JSON.stringify({ viewedAt: Date.now() }));
  } catch {
    // localStorage unavailable (e.g. private mode) — progress just won't persist.
  }
}

/** Whether a legacy checkpoint-quiz score meets the old pass threshold. */
function legacyQuizPassed(moduleId: string): boolean {
  try {
    const raw = localStorage.getItem(legacyQuizKey(moduleId));
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (typeof parsed.score !== "number" || typeof parsed.total !== "number" || parsed.total <= 0) return false;
    return parsed.score / parsed.total >= PASS_THRESHOLD;
  } catch {
    return false;
  }
}

/** Whether a module counts as complete (recap seen, or legacy quiz passed). */
export function isModuleComplete(moduleId: string): boolean {
  return readRecapView(moduleId) !== null || legacyQuizPassed(moduleId);
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
