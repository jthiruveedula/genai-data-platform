import { expect, test } from '@playwright/test';

// The section rail is built from the page's own <h2>s at runtime, so the risks
// are: it disagrees with the headings, it has no accessible name (it is a
// column of ticks), it fails to track scroll, or it appears where there is no
// edge to spare.

const MODULE = 'modules/65-security/';

test('the rail is built from the page headings, and each tick is named', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(MODULE);

  const rail = page.locator('[data-section-rail]');
  await expect(rail).toBeVisible();

  const headings = await page.locator('article h2').allInnerTexts();
  const ticks = rail.locator('button');
  await expect(ticks).toHaveCount(headings.length);

  // A tick with no accessible name is an unlabelled control; the heading text
  // is that name.
  const names = await ticks.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
  expect(names).toEqual(headings.map((h) => h.trim()));
});

test('the active tick follows the section being read', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(MODULE);

  const current = () =>
    page.locator('[data-section-rail] button[aria-current="true"]').getAttribute('aria-label');

  const headings = page.locator('article h2');
  const third = (await headings.nth(2).innerText()).trim();
  // Scroll the heading to the TOP, not merely into view: a heading sitting at
  // mid-viewport is not yet the section you are reading — the previous one's
  // prose still fills the screen above it — and the rail deliberately waits
  // until a heading passes the upper third before claiming it.
  await headings.nth(2).evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect.poll(current, { timeout: 5000 }).toBe(third);

  const first = (await headings.nth(0).innerText()).trim();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(current, { timeout: 5000 }).toBe(first);
});

test('clicking a tick moves to that section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(MODULE);

  const target = page.locator('article h2').nth(3);
  const title = (await target.innerText()).trim();
  await page.locator('[data-section-rail] button').nth(3).click();

  await expect
    .poll(async () => target.evaluate((el) => Math.round(el.getBoundingClientRect().top)), {
      timeout: 5000,
    })
    .toBeLessThan(200);
  await expect
    .poll(async () =>
      page.locator('[data-section-rail] button[aria-current="true"]').getAttribute('aria-label'),
    )
    .toBe(title);
});

test('no rail where there is no edge to spare', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto(MODULE);
  // Present in the DOM (it is one component for every width) but not shown.
  await expect(page.locator('[data-section-rail]')).toBeHidden();
});
