import { expect, test } from '@playwright/test';

// The ledger's whole value is being true and complete: it is the site's claim
// that it is maintained. So the tests check it against the data rather than
// against a snapshot of how it looks.

test('every release in the data reaches the page, newest first', async ({ page }) => {
  await page.goto('changelog/');

  const tags = await page.locator('.cl-tag').allInnerTexts();
  expect(tags.length).toBeGreaterThanOrEqual(15);
  expect(tags[0]).toMatch(/^v\d+\.\d+\.\d+$/);

  // Descending by version: a ledger that lists the oldest release first is a
  // different document.
  const rank = (t: string) => t.slice(1).split('.').map(Number);
  for (let i = 1; i < tags.length; i++) {
    const [aMaj, aMin, aPatch] = rank(tags[i - 1]);
    const [bMaj, bMin, bPatch] = rank(tags[i]);
    const newer = aMaj > bMaj || (aMaj === bMaj && (aMin > bMin || (aMin === bMin && aPatch > bPatch)));
    expect(newer, `${tags[i - 1]} should sort above ${tags[i]}`).toBe(true);
  }
});

test('every entry says what changed, and links to its tag', async ({ page }) => {
  await page.goto('changelog/');

  const items = page.locator('.cl-item');
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    // A summary is the point: a row with a version and no explanation is a
    // git log, which the reader could already have read.
    await expect(item.locator('.cl-summary')).not.toBeEmpty();
    await expect(item.locator('.cl-tag')).toHaveAttribute(
      'href',
      /github\.com\/.+\/releases\/tag\/v\d/,
    );
    await expect(item.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('exactly one release is marked live', async ({ page }) => {
  await page.goto('changelog/');
  await expect(page.locator('.cl-live')).toHaveCount(1);
  // …and it is the first one listed.
  await expect(page.locator('.cl-item').first().locator('.cl-live')).toBeVisible();
});

test('the site links to it', async ({ page }) => {
  await page.goto('modules/45-evaluation/');
  const link = page.locator('footer a[href$="/changelog/"]').first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page.locator('h1')).toContainText('shipped');
});
