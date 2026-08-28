import { expect, test } from '@playwright/test';

// Glossary tooltips are grafted onto already-rendered prose at runtime, so the
// risks are all about what the graft touches: it must mark real terms, never
// swallow a link or a heading, and stay operable by keyboard as well as hover.

const MODULE = 'modules/00-foundations/';

test('terms in the prose become tooltip triggers, once each', async ({ page }) => {
  await page.goto(MODULE);

  const terms = page.locator('article .gterm');
  await expect(terms.first()).toBeVisible();

  const labels = await terms.evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).dataset.term ?? ''),
  );
  expect(labels.length).toBeGreaterThan(3);
  // One mark per headword: a page peppered with the same underline is noise.
  expect(new Set(labels).size).toBe(labels.length);
});

test('no term is planted inside a heading, link, or code span', async ({ page }) => {
  await page.goto(MODULE);
  const trespassing = await page
    .locator('article .gterm')
    .evaluateAll((els) => els.filter((el) => el.closest('a, code, pre, h1, h2, h3, .chip')).length);
  expect(trespassing).toBe(0);
});

test('clicking a term opens its definition, Escape closes it', async ({ page }) => {
  await page.goto(MODULE);

  const term = page.locator('article .gterm').first();
  const name = await term.evaluate((el) => (el as HTMLElement).dataset.term);
  await term.click();

  const tip = page.locator('[data-glossary-tip]');
  await expect(tip).toBeVisible();
  await expect(tip.locator('[data-gt-term]')).toHaveText(name!);
  await expect(tip.locator('[data-gt-def]')).not.toBeEmpty();

  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await expect(term).toBeFocused();
});

test('a term is reachable and openable from the keyboard', async ({ page }) => {
  await page.goto(MODULE);
  const term = page.locator('article .gterm').first();
  await term.focus();
  await expect(page.locator('[data-glossary-tip]')).toBeVisible();
});

test('every module heading gets a stable, shareable id', async ({ page }) => {
  await page.goto(MODULE);
  const ids = await page.locator('article h2').evaluateAll((els) => els.map((el) => el.id));
  expect(ids.every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);
  // The id is derived from the heading, not from its position in the page.
  expect(ids.some((id) => id.startsWith('section-'))).toBe(false);

  await expect(page.locator('article h2').first().locator('.head-anchor')).toHaveCount(1);
});
