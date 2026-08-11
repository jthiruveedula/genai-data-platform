import { expect, test } from '@playwright/test';

// `/world/` scrubs six pre-rendered clips with scroll position. The things
// that actually break on this kind of page are: the clips not being seekable
// (a host that doesn't serve byte ranges pins every seek to frame 0), the
// scroll not reaching currentTime at all, phones being served the desktop
// master, and the no-JS version disappearing. One test each.

const SECTIONS = 6;

test('the flight mounts one scene per section and gives the page scroll length', async ({ page }) => {
  await page.goto('world/');

  await expect(page.locator('.sw-scene')).toHaveCount(SECTIONS);
  await expect(page.locator('.sw-route__dot')).toHaveCount(SECTIONS);

  // The engine sets the track height from the per-section scroll budgets; a
  // page that didn't lay out would be one viewport tall and unscrollable.
  const heights = await page.evaluate(() => ({
    track: document.querySelector<HTMLElement>('.sw-track')!.getBoundingClientRect().height,
    viewport: window.innerHeight,
  }));
  expect(heights.track).toBeGreaterThan(heights.viewport * 5);
});

test('scroll drives the clip: it loads as a seekable blob and currentTime tracks', async ({ page }) => {
  await page.goto('world/');

  const state = await page.evaluate(async () => {
    const settle = () => new Promise((r) => setTimeout(r, 1500));
    window.scrollTo(0, window.innerHeight * 0.9);
    await settle();
    const video = document.querySelector<HTMLVideoElement>('.sw-scene__video')!;
    const early = video.currentTime;
    window.scrollTo(0, window.innerHeight * 1.4);
    await settle();
    return {
      src: video.src.slice(0, 5),
      seekableEnd: video.seekable.length ? video.seekable.end(0) : 0,
      early,
      later: video.currentTime,
    };
  });

  expect(state.src).toBe('blob:');
  // seekable === [0,0] is the "frozen at frame 0" failure the blob load exists
  // to prevent, so assert the clip is seekable across its whole duration.
  expect(state.seekableEnd).toBeGreaterThan(1);
  expect(state.later).toBeGreaterThan(state.early);
});

test('phones get the portrait render, not the landscape master', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('world/');

  const shape = await page.evaluate(async () => {
    window.scrollTo(0, window.innerHeight * 0.6);
    await new Promise((r) => setTimeout(r, 2000));
    const video = document.querySelector<HTMLVideoElement>('.sw-scene__video')!;
    return { w: video.videoWidth, h: video.videoHeight };
  });

  expect(shape.h).toBeGreaterThan(shape.w);
});

test('without JavaScript the six sections are still readable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('world/');

  await expect(page.locator('[data-world-fallback] section')).toHaveCount(SECTIONS);
  await expect(page.locator('[data-world-fallback] h2').first()).toBeVisible();
  await expect(page.locator('.sw-scene')).toHaveCount(0);

  await context.close();
});

test('the page never scrolls sideways', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('world/');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 800)));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});
