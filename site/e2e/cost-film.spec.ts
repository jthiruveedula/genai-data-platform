import { expect, test } from '@playwright/test';

// The film is an explainer, not decoration. What matters: it is present and
// playable on the module whose argument it makes, it does NOT autoplay or
// preload (it is 1.2MB on a reading page), and its poster stands in until
// someone asks for it.

const MODULE = 'modules/75-finops/';

test('the film sits on the module whose claim it illustrates', async ({ page }) => {
  await page.goto(MODULE);
  const film = page.locator('[data-cost-film]');
  await film.scrollIntoViewIfNeeded();
  await expect(film).toBeVisible();
  await expect(film).toContainText('WHERE THE MONEY GOES');
  // The provenance promise is in the caption, not just in the film.
  await expect(film).toContainText('verified price list');
});

test('it costs nothing until asked for', async ({ page }) => {
  await page.goto(MODULE);
  const video = page.locator('[data-film-video]');
  await video.scrollIntoViewIfNeeded();

  // No autoplay, no preload: a 1.2MB video must not download itself on a page
  // someone came to read.
  await expect(video).toHaveAttribute('preload', 'none');
  await expect(video).not.toHaveAttribute('autoplay', /.*/);
  await expect(video).toHaveAttribute('poster', /query-cost\.jpg$/);
  await expect(video).toHaveAttribute('controls', '');

  const paused = await video.evaluate((v) => (v as HTMLVideoElement).paused);
  expect(paused, 'video is not playing on load').toBe(true);
});

test('the film and its poster are actually served', async ({ request, baseURL }) => {
  for (const file of [
    'film/query-cost.mp4',
    'film/query-cost.jpg',
    'film/query-cost-portrait.mp4',
    'film/query-cost-portrait.jpg',
  ]) {
    const res = await request.get(new URL(file, baseURL).toString());
    expect(res.status(), file).toBe(200);
  }
});

test('it plays when asked', async ({ page }) => {
  await page.goto(MODULE);
  const video = page.locator('[data-film-video]');
  await video.scrollIntoViewIfNeeded();

  await video.evaluate(async (el) => {
    const v = el as HTMLVideoElement;
    v.muted = true;
    await v.play();
  });
  await expect
    .poll(async () => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 10_000 })
    .toBeGreaterThan(0.2);
});

test("OpenMontage's review frames never ship", async ({ request, baseURL }) => {
  // The renderer writes .final_review_frames/ beside its output; render.sh
  // removes it, and this makes sure a future render can't quietly publish it.
  const res = await request.get(new URL('film/.final_review_frames/', baseURL).toString());
  expect(res.status()).toBeGreaterThanOrEqual(400);
});
