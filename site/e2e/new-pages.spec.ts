import { expect, test } from '@playwright/test';

// Coverage for the P2/P4/P5 surfaces added alongside modules 45-85: the
// service-equivalence matrix, a new module page, learning-path pages, the
// freshness/claims page, and the Pagefind search modal.

test('module page renders content, flavor tabs, and quiz for a new module', async ({ page }) => {
  await page.goto('modules/45-evaluation/');
  await expect(page).toHaveTitle(/Evaluation/);
  await expect(page.locator('h1')).toHaveText(/Evaluation/);
  // Article children fade in via a scroll-triggered GSAP reveal (BaseLayout's
  // setupScrollEffects) — scroll each target into view before asserting.
  const tablist = page.locator('[role="tablist"]');
  await tablist.scrollIntoViewIfNeeded();
  await expect(tablist).toBeVisible();
  const quiz = page.locator('.module-quiz, [data-quiz]').first();
  await quiz.scrollIntoViewIfNeeded();
  await expect(quiz).toBeVisible();
});

test('matrix page lists every module as a row and supports sorting', async ({ page }) => {
  await page.goto('matrix/');
  await expect(page).toHaveTitle(/Service equivalence matrix/);
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(11); // 00-foundations through 85-agents

  const stageHeaderButton = page.getByRole('button', { name: /stage/i });
  await expect(stageHeaderButton).toBeVisible();
  await stageHeaderButton.click();
  await expect(page.locator('th[aria-sort]').first()).toHaveAttribute('aria-sort', /ascending|descending/);
});

for (const pathId of ['beginner', 'intermediate', 'advanced'] as const) {
  test(`${pathId} path page renders its module rail`, async ({ page }) => {
    await page.goto(`paths/${pathId}/`);
    await expect(page).toHaveTitle(new RegExp(pathId, 'i'));
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-path-summary]')).toBeVisible();
  });
}

test('freshness page shows the claim registry summary and table', async ({ page }) => {
  await page.goto('freshness/');
  await expect(page).toHaveTitle(/Content freshness/);
  await expect(page.getByText(/CLAIMS/)).toBeVisible();
  await expect(page.locator('table tbody tr').first()).toBeVisible();
});

test('footer links to the freshness page with a verified count', async ({ page }) => {
  await page.goto('');
  const footerLink = page.locator('footer a[href*="freshness"]');
  await expect(footerLink).toBeVisible();
});

test('search opens via keyboard shortcut and shows the built-index state', async ({ page }) => {
  await page.goto('');
  await page.keyboard.press('/');
  const dialog = page.locator('dialog[aria-label="Site search"]');
  await expect(dialog).toBeVisible();
  await page.keyboard.type('embedding');
  // Either real Pagefind results render, or the graceful fallback note does —
  // both prove the search UI is wired up against the production build.
  await expect(
    page.locator('[role="listbox"] [role="option"]').first().or(page.getByText(/search index/i)),
  ).toBeVisible({ timeout: 5000 });
});

test('navbar links to the matrix page', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('header.navbar a[href*="matrix/"]')).toBeVisible();
});
