import { expect, test } from '@playwright/test';

// The wiring map is a picture of data that is also rendered as text right
// beneath it, so the risks are that the two disagree, that the picture claims
// a second tab stop it has not earned, or that it forces the page sideways on
// a phone.

const MODULE = 'modules/45-evaluation/';

test('the map draws every edge in the graph and accents this module\'s own', async ({ page }) => {
  await page.goto(MODULE);
  const map = page.locator('[data-wiring-map]');
  await map.scrollIntoViewIfNeeded();

  await expect(map).toBeVisible();
  await expect.poll(async () => map.getAttribute('data-drawn')).toBe('true');

  // Accented edges are exactly the ones the lists beneath name.
  const listed = await page.locator('.wiring-list li a').count();
  await expect(map.locator('.wm-edge.is-mine')).toHaveCount(listed);

  // Upstream edges are the dashed ones, and there are as many as "Builds on".
  const buildsOn = await page.locator('.wiring-col').first().locator('.wiring-list li').count();
  await expect(map.locator('.wm-edge.is-mine.is-upstream')).toHaveCount(buildsOn);
});

test('the current module is the marked node, and it is named', async ({ page }) => {
  await page.goto(MODULE);
  const map = page.locator('[data-wiring-map]');
  await map.scrollIntoViewIfNeeded();

  await expect(map.locator('.wm-node.is-current')).toHaveCount(1);
  const heading = (await page.locator('h1').innerText()).trim();
  await expect(map.locator('.wm-current-name')).toHaveText(heading);
});

test('the map is decorative: the navigable version is the list below it', async ({ page }) => {
  await page.goto(MODULE);
  const map = page.locator('[data-wiring-map]');
  await expect(map).toHaveAttribute('aria-hidden', 'true');
  await expect(map.locator('a, button')).toHaveCount(0);
  // The links it duplicates are real, and they go to real module pages.
  await expect(page.locator('.wiring-list li a').first()).toHaveAttribute('href', /\/modules\//);
});

test('a phone scrolls the map rather than the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto(MODULE);
  await page.locator('[data-wiring-map]').scrollIntoViewIfNeeded();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  // …and it starts on the module being read, not at module 00.
  const scrolled = await page.locator('[data-wiring-map] .wm-scroll').evaluate((el) => el.scrollLeft);
  expect(scrolled).toBeGreaterThan(0);
});

test('under reduced motion the map is simply drawn', async ({ browser }) => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto('http://localhost:4321/genai-data-platform/' + MODULE);
  const map = page.locator('[data-wiring-map]');
  await map.scrollIntoViewIfNeeded();

  await expect.poll(async () => map.getAttribute('data-drawn')).toBe('true');
  const hidden = await map
    .locator('[data-wm-edge]')
    .evaluateAll((els) => els.filter((el) => (el as SVGPathElement).style.strokeDashoffset).length);
  expect(hidden).toBe(0);
  await page.close();
});
