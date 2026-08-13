import { expect, test } from '@playwright/test';

// The hero is now two layers: a pre-rendered room (tools/hero-film/) and the
// live WebGL scene composited over it. The risks worth testing are all about
// the film earning its bytes — it must never cost a phone, a reduced-motion
// visitor, or the initial load anything.

test('the poster is in the markup, so the hero is never an empty box', async ({ page }) => {
  await page.goto('');
  const poster = page.locator('[data-pf-hero-backdrop] img');
  await expect(poster).toHaveAttribute('src', /hero-poster\.jpg$/);
  // In the HTML rather than injected: it has to paint before any script runs.
  const inHtml = await page.evaluate(async () => {
    const res = await fetch(location.href, { cache: 'reload' });
    return (await res.text()).includes('hero-poster.jpg');
  });
  expect(inHtml).toBe(true);
});

test('the live scene draws over the film, and the film keeps the floor', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('.pf-hero__canvas canvas')).toBeVisible();
  // Both layers persist: the backdrop is not a placeholder to be torn down.
  await page.waitForTimeout(2500);
  await expect(page.locator('[data-pf-hero-backdrop]')).toBeAttached();
});

test('the loop upgrades the poster on a desktop that allows motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('');

  const video = page.locator('[data-pf-hero-backdrop] video');
  await expect(video).toBeAttached({ timeout: 15_000 });
  await expect(video).toHaveClass(/is-playing/, { timeout: 15_000 });
  await expect(video).toHaveAttribute('src', /hero-loop\.mp4$/);
  expect(await video.evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true);
  expect(await video.evaluate((v) => (v as HTMLVideoElement).loop)).toBe(true);
});

test('phones get the poster only', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('');
  await page.waitForTimeout(2500);
  await expect(page.locator('[data-pf-hero-backdrop] img')).toBeVisible();
  await expect(page.locator('[data-pf-hero-backdrop] video')).toHaveCount(0);
  await context.close();
});

test('reduced motion gets the poster only', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('');
  await page.waitForTimeout(2500);
  await expect(page.locator('[data-pf-hero-backdrop] img')).toBeVisible();
  await expect(page.locator('[data-pf-hero-backdrop] video')).toHaveCount(0);
  await context.close();
});

test('the hero assets are served', async ({ request, baseURL }) => {
  for (const file of ['hero/hero-poster.jpg', 'hero/hero-loop.mp4']) {
    const res = await request.get(new URL(file, baseURL).toString());
    expect(res.status(), file).toBe(200);
  }
});
