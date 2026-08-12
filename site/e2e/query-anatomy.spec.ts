import { expect, test } from '@playwright/test';

// The section's job is to be TRUE, not just to look good: every figure on it
// comes from pricing.json via lib/queryCost.ts. These tests guard the parts a
// unit test cannot see — that the numbers reach the page, that switching cloud
// switches the figures, and that the table (which is the content) survives
// without JavaScript and under reduced motion.

test('the table carries the real, sourced numbers', async ({ page }) => {
  await page.goto('');
  const section = page.locator('[data-query-anatomy]');
  await section.scrollIntoViewIfNeeded();

  // GCP is the default selection; its fast-tier output price is $3/Mtok and a
  // 400-token answer therefore costs $0.00120.
  const visible = section.locator('.cloud-swap-block:visible');
  await expect(visible).toHaveCount(1);
  await expect(visible).toContainText('Gemini 3 Flash');
  await expect(visible).toContainText('$0.00120');
  await expect(visible).toContainText('2,100');
  // Provenance, not just figures.
  await expect(visible).toContainText('verified 2026-07-18');
});

test('switching cloud switches the bill', async ({ page }) => {
  await page.goto('');
  const section = page.locator('[data-query-anatomy]');
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator('.cloud-swap-block:visible')).toContainText('Gemini 3 Flash');

  await page.evaluate(() => document.documentElement.setAttribute('data-cloud', 'aws'));
  const aws = section.locator('.cloud-swap-block:visible');
  await expect(aws).toHaveCount(1);
  await expect(aws).toContainText('Claude Haiku 4.5');
  // AWS output is $5/Mtok → $0.00200 for the same 400-token answer.
  await expect(aws).toContainText('$0.00200');
});

test('self-hosting is never given a per-token price', async ({ page }) => {
  await page.goto('');
  const section = page.locator('[data-query-anatomy]');
  await section.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.documentElement.setAttribute('data-cloud', 'oss'));

  const oss = section.locator('.cloud-swap-block:visible');
  await expect(oss).toContainText('GPU-hour metered');
  await expect(oss).toContainText('not billed per token');
  // The tokens are still real — the work happens either way.
  await expect(oss).toContainText('2,100');
  // And no invented dollar figure for a query.
  await expect(oss).not.toContainText('$0.001');
});

test('the 3D view hydrates over the table and labels both skylines', async ({ page }) => {
  await page.goto('');
  const section = page.locator('[data-query-anatomy]');
  await section.scrollIntoViewIfNeeded();

  await expect(section).toHaveAttribute('data-mode', '3d', { timeout: 15_000 });
  await expect(section.locator('canvas')).toBeVisible();
  await expect(section.locator('.qa-axis').first()).toHaveText('tokens sent');
  await expect(section.locator('.qa-axis').nth(1)).toHaveText('money spent');
  // One tick per segment on the token row.
  await expect(section.locator('.qa-tick').first()).toBeVisible();
});

test('without JavaScript the numbers are still there', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('');

  const section = page.locator('[data-query-anatomy]');
  await expect(section).not.toHaveAttribute('data-mode', '3d');
  await expect(section.locator('canvas')).toHaveCount(0);
  // The default (no data-cloud attribute) still shows one table.
  await expect(section.locator('.qa-table').first()).toBeVisible();
  await expect(section).toContainText('$0.00120');
  await context.close();
});

test('reduced motion keeps the table and never mounts the scene', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('');

  const section = page.locator('[data-query-anatomy]');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await expect(section).not.toHaveAttribute('data-mode', '3d');
  await expect(section.locator('canvas')).toHaveCount(0);
  await expect(section.locator('.qa-table').first()).toBeVisible();
  await context.close();
});

test('the headline matches what the model computes', async ({ page }) => {
  await page.goto('');
  const heading = page.locator('#qa-title');
  // Not a hardcoded claim: 400 of 2,700 tokens is 15%, and $0.00120 of
  // $0.00234 is 51%. If pricing.json moves, this heading must move with it.
  await expect(heading).toContainText('15% of the tokens');
  await expect(heading).toContainText('51% of the bill');
});
