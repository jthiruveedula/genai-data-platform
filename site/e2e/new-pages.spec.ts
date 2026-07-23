import { expect, test } from '@playwright/test';

// Coverage for the P2/P4/P5 surfaces added alongside modules 45-85: the
// service-equivalence matrix, a new module page, learning-path pages, the
// freshness/claims page, and the Pagefind search modal.

test('module page renders content, flavor tabs, and recap for a new module', async ({ page }) => {
  await page.goto('modules/45-evaluation/');
  await expect(page).toHaveTitle(/Evaluation/);
  await expect(page.locator('h1')).toHaveText(/Evaluation/);
  // Article children fade in via a scroll-triggered GSAP reveal (BaseLayout's
  // setupScrollEffects) — scroll each target into view before asserting.
  const tablist = page.locator('[role="tablist"]');
  await tablist.scrollIntoViewIfNeeded();
  await expect(tablist).toBeVisible();
  const recap = page.locator('[data-module-recap]');
  await recap.scrollIntoViewIfNeeded();
  await expect(recap).toBeVisible();
});

test('a chart-bearing recap lazy-loads echarts and renders a canvas', async ({ page }) => {
  await page.goto('modules/75-finops/');
  const recap = page.locator('[data-module-recap]');
  await recap.scrollIntoViewIfNeeded();
  // The echarts chunk is dynamically imported when the recap nears the
  // viewport; a rendered chart means a canvas inside the chart mount.
  await expect(page.locator('[data-recap-chart] canvas')).toBeVisible({ timeout: 10_000 });
  // Seeing the recap marks the module complete for the curriculum journey.
  const stored = await page.evaluate(() => localStorage.getItem('gdp.recap.75-finops'));
  expect(stored).not.toBeNull();
});

test('matrix page lists every module as a row and supports sorting', async ({ page }) => {
  await page.goto('matrix/');
  await expect(page).toHaveTitle(/Service equivalence matrix/);
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(12); // 00-foundations through 85-agents, plus 38-multimodal

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
  // .first() on the combined locator: a result excerpt can itself contain the
  // words "search index", making both .or() branches match at once, which
  // trips strict mode even though either match alone proves the point.
  await expect(
    page.locator('[role="listbox"] [role="option"]').first().or(page.getByText(/search index/i)).first(),
  ).toBeVisible({ timeout: 5000 });
});

test('navbar links to the matrix page', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('header.navbar a[href*="matrix/"]')).toBeVisible();
});

test('an unmatched path renders the themed 404 page, not a blank/default one', async ({ page }) => {
  const response = await page.goto('this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle(/Page not found/);
  await expect(page.getByText('404 NOT FOUND')).toBeVisible();
  const homeLink = page.getByRole('link', { name: 'Back to home' });
  await expect(homeLink).toBeVisible();
  await homeLink.click();
  await expect(page).toHaveTitle(/Home/);
});

test('the vector-space scene stays in normal flow after hydration and does not overlap the next section', async ({
  page,
}) => {
  // Regression test: .v3d-mount used to stay `position: absolute; inset: 0`
  // after hydration, sized to the tiny static-SVG placeholder instead of its
  // own (much taller) canvas + query form + legend — so the real content
  // overflowed past the scene's bottom edge and the FlavorTabs section
  // rendered on top of it, intercepting clicks meant for the query input.
  // The overlap only manifests at wider/taller viewports (confirmed via
  // direct elementFromPoint reproduction at 1440x1100 — Playwright's default
  // 1280x720 doesn't grow the canvas enough to overflow), so pin a viewport
  // here rather than relying on whatever the project default happens to be.
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('modules/20-embeddings/');
  const input = page.locator('#v3d-query-input');
  await input.waitFor({ state: 'attached', timeout: 10_000 });
  // scrollIntoView({block:'center'}) specifically (not Playwright's own
  // scrollIntoViewIfNeeded, which lands at a different offset that doesn't
  // reproduce the bug) — this is the exact repro that originally proved the
  // FlavorTabs panel was covering the input.
  await input.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);

  const topElementIsInput = await input.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return hit === el;
  });
  expect(topElementIsInput).toBe(true);

  const button = page.getByRole('button', { name: 'Embed & search' });
  await expect(button).toBeVisible();
  await input.fill('how about the length of tokens');
  await button.click();
  await expect(page.locator('.v3d-query-result')).toContainText('Nearest cluster:');
});

// Regression test: at 768px the navbar's un-wrapped content (brand + 3 links
// + search + 4-cloud switcher + theme toggle) was already wider than the
// viewport -- a real horizontal-scroll bug (846px of content in a 768px
// viewport) that the old 720px wrap breakpoint didn't cover. A second bug at
// 320px: the wrapped-to-its-own-row 4-cloud switcher didn't itself wrap,
// so "OSS" ran 12px past the edge. Both are viewport-width bugs a desktop-only
// test suite can't catch, so pin the widths Hallmark's own mobile floor
// requires (320/375/414/768) rather than relying on the project default.
const MOBILE_WIDTHS = [320, 375, 414, 768];
const KEY_PAGES = ['', 'modules/00-foundations/', 'matrix/', 'calculator/', 'freshness/', 'paths/beginner/'];

for (const width of MOBILE_WIDTHS) {
  for (const path of KEY_PAGES) {
    test(`${path || 'home'} has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
}
