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

test('each room links to the modules that teach it', async ({ page }) => {
  await page.goto('world/');

  // Six rooms, twelve modules, each placed exactly once (worldRooms.test.ts
  // enforces the mapping; this checks it actually reaches the page).
  await expect(page.locator('.world-taught')).toHaveCount(SECTIONS);
  const hrefs = await page.locator('.world-taught__list a').evaluateAll((links) =>
    links.map((l) => (l as HTMLAnchorElement).getAttribute('href')),
  );
  expect(hrefs).toHaveLength(12);
  expect(new Set(hrefs).size).toBe(12);
  expect(hrefs.every((h) => /\/modules\/[\w-]+\/$/.test(h ?? ''))).toBe(true);
});

test('a finished module is marked done in its room', async ({ page }) => {
  await page.goto('world/');
  // Written by ModuleRecap via lib/progress.ts — the same contract the
  // curriculum journey reads, so progress made anywhere shows up here.
  await page.evaluate(() =>
    localStorage.setItem('gdp.recap.20-embeddings', JSON.stringify({ viewedAt: Date.now() })),
  );
  await page.reload();

  const done = page.locator('.world-taught__list a[data-complete]');
  await expect(done).toHaveCount(1);
  await expect(done).toHaveAttribute('href', /\/modules\/20-embeddings\/$/);
  // The embed room owns exactly that one module, so its header reads all-done.
  await expect(page.locator('.world-taught__head').nth(2)).toContainText('all 1 done');
});

test('a room is a deep link, and the hash follows the flight', async ({ page }) => {
  await page.goto('world/#reason');
  // Landing on a hash should put the camera in that room, not at the start.
  await expect
    .poll(async () => page.evaluate(() => window.scrollY / window.innerHeight), { timeout: 10_000 })
    .toBeGreaterThan(5);
  await expect(page.locator('.sw-route__dot').nth(4)).toHaveClass(/is-active/);

  // Flying on rewrites the hash, so any position is shareable.
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.4));
  await expect.poll(async () => new URL(page.url()).hash, { timeout: 10_000 }).toBe('#sources');
});

test('keyboard alone flies the whole route', async ({ page }) => {
  await page.goto('world/');
  await expect(page.locator('.sw-route__dot').first()).toHaveClass(/is-active/);

  await page.keyboard.press('End');
  await expect(page.locator('.sw-route__dot').last()).toHaveClass(/is-active/);

  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.sw-route__dot').nth(SECTIONS - 2)).toHaveClass(/is-active/);

  await page.keyboard.press('Home');
  await expect(page.locator('.sw-route__dot').first()).toHaveClass(/is-active/);
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
