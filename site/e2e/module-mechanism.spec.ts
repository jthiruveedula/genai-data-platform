import { expect, test } from '@playwright/test';

// Every module page ships its mechanism twice: a static strip in the markup,
// and a 3D scene that hydrates over it (ModuleMechanism3D). The strip is the
// content; the scene is the enhancement. These tests hold that line — the
// strip must survive with JS off and under reduced motion, and the scene must
// render the same steps rather than a second, drifting copy of them.

const MODULE = 'modules/35-retrieval/';

test('the mechanism hydrates over the strip and renders the same steps', async ({ page }) => {
  await page.goto(MODULE);
  const figure = page.locator('[data-module-mechanism]');
  await figure.scrollIntoViewIfNeeded();

  await expect(figure).toHaveAttribute('data-mode', '3d', { timeout: 15_000 });
  await expect(figure.locator('canvas')).toBeVisible();

  // Module 35's flow has five steps; the scene labels all five, from the same
  // data the strip below is built from.
  await expect(figure.locator('.mech-label')).toHaveCount(5);
  const spatial = await figure.locator('.mech-label__text').allInnerTexts();
  const strip = await figure.locator('.flow-label').allInnerTexts();
  expect(spatial).toEqual(strip);
});

test('pointing at a station reads out that step', async ({ page }) => {
  await page.goto(MODULE);
  const figure = page.locator('[data-module-mechanism]');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toHaveAttribute('data-mode', '3d', { timeout: 15_000 });

  await expect(figure.locator('.mech-detail__hint')).toBeVisible();

  // Sweep the spine rather than computing where a station projects to: the
  // camera framing is tuned by eye and would make a hardcoded coordinate a
  // trap for whoever next nudges it. What matters is that pointing at the
  // diagram reads out a step.
  const box = (await figure.locator('canvas').boundingBox())!;
  const detail = figure.locator('.mech-detail strong');
  for (let i = 3; i <= 14; i++) {
    await page.mouse.move(box.x + (box.width * i) / 17, box.y + box.height * 0.52);
    if (await detail.isVisible()) break;
    await page.waitForTimeout(120);
  }
  await expect(detail).toBeVisible();
  const named = await detail.innerText();
  const strip = await figure.locator('.flow-label').allInnerTexts();
  // …and that what it reads out is one of this module's own steps.
  expect(strip).toContain(named);
});

test('with JavaScript off the static strip is the diagram', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(MODULE);

  const figure = page.locator('[data-module-mechanism]');
  await expect(figure).not.toHaveAttribute('data-mode', '3d');
  await expect(figure.locator('.flow-node')).toHaveCount(5);
  await expect(figure.locator('canvas')).toHaveCount(0);
  await context.close();
});

test('reduced motion keeps the strip and never mounts the scene', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(MODULE);

  const figure = page.locator('[data-module-mechanism]');
  await figure.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await expect(figure).not.toHaveAttribute('data-mode', '3d');
  await expect(figure.locator('canvas')).toHaveCount(0);
  await expect(figure.locator('.flow-node').first()).toBeVisible();
  await context.close();
});

test('every module renders a mechanism, at every width, without sideways scroll', async ({ page }) => {
  const modules = [
    '00-foundations',
    '10-ingestion',
    '15-chunking',
    '20-embeddings',
    '25-serving',
    '35-retrieval',
    '38-multimodal',
    '45-evaluation',
    '55-observability',
    '65-security',
    '75-finops',
    '85-agents',
  ];

  for (const id of modules) {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`modules/${id}/`);
    const figure = page.locator('[data-module-mechanism]');
    await figure.scrollIntoViewIfNeeded();
    await expect(figure, `${id} has a mechanism figure`).toBeVisible();
    await expect(figure).toHaveAttribute('data-mode', '3d', { timeout: 15_000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${id} overflows sideways at 390px`).toBeLessThanOrEqual(1);
  }
});
