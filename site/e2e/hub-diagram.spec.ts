import { expect, test } from '@playwright/test';

// The serving-hub diagram is generated from moduleEdges.ts and drawn to the
// diagram-design skill's grammar. Its packaged self_check.py lints STANDALONE
// diagram files, so it can't be pointed at a site page — these assert the
// parts of that contract which apply to an embedded diagram, and the layout
// invariants that make it readable.

const PAGE = 'modules/25-serving/';

test('the accessible-SVG contract holds', async ({ page }) => {
  await page.goto(PAGE);
  const svg = page.locator('svg.hub-svg');
  await expect(svg).toHaveAttribute('role', 'img');

  const contract = await svg.evaluate((el) => {
    const first = el.firstElementChild;
    const labelled = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/);
    return {
      firstChildIsTitle: first?.tagName.toLowerCase() === 'title',
      labelled,
      resolves: labelled.every((id) => !!el.querySelector(`#${id}`)),
      titleLen: el.querySelector('title')?.textContent?.trim().length ?? 0,
      descLen: el.querySelector('desc')?.textContent?.trim().length ?? 0,
    };
  });

  // Title must be the first child — assistive tech may ignore it otherwise.
  expect(contract.firstChildIsTitle).toBe(true);
  expect(contract.resolves).toBe(true);
  // IDs prefixed per diagram, never bare `title`/`desc`: two inline diagrams
  // would otherwise collide and the second be announced with the first's name.
  expect(contract.labelled).toEqual(['serving-hub-title', 'serving-hub-desc']);
  expect(contract.titleLen).toBeGreaterThan(0);
  expect(contract.titleLen).toBeLessThanOrEqual(70);
  expect(contract.descLen).toBeGreaterThan(40);
});

test('it stays inside the complexity budget, with one focal element', async ({ page }) => {
  await page.goto(PAGE);
  // 9 nodes / 12 arrows is the skill's budget; this sits well under it.
  await expect(page.locator('.hub-node')).toHaveCount(8);
  await expect(page.locator('.hub-link')).toHaveCount(7);
  await expect(page.locator('.hub-node--focal')).toHaveCount(1);
});

test('every connector is independently traceable', async ({ page }) => {
  await page.goto(PAGE);
  const paths = await page.locator('.hub-link').evaluateAll((els) =>
    els.map((e) => e.getAttribute('d') ?? ''),
  );
  // No two connectors may share a stroke path. Identical `d` is the blunt
  // version of that failure; the lane stagger is what prevents it.
  expect(new Set(paths).size).toBe(paths.length);
  // Orthogonal only: every path is H/V moves and quarter-arc bends.
  for (const d of paths) {
    expect(d, `diagonal segment in ${d}`).not.toMatch(/\sL\s/);
  }
});

test('the nodes are the real graph, not a drawing', async ({ page }) => {
  await page.goto(PAGE);
  const names = await page
    .locator('.hub-node__name')
    .evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? ''));
  // Exactly what moduleEdges.ts says feeds and reads from Module 25.
  expect(names).toEqual([
    'Embeddings & vector store',
    'Retrieval quality',
    'Security for GenAI',
    'FinOps for GenAI',
    'Observability for LLMs',
    'Evaluation',
    'Agents & tool use',
    'Serving a RAG API',
  ]);
});

test('it re-tints with the cloud selection', async ({ page }) => {
  await page.goto(PAGE);
  const focalStroke = () =>
    page.locator('.hub-node--focal .hub-node__box').evaluate((el) => getComputedStyle(el).stroke);

  const gcp = await focalStroke();
  // Drive the real control, not the attribute: the Modernist accent is keyed
  // on `data-pf-cloud`, and the navbar sets that alongside `data-cloud`.
  // Setting one by hand looks like it works and changes nothing.
  await page.locator('[data-cloud-btn="oss"]').click();
  await expect.poll(focalStroke).not.toBe(gcp);
});

// — motion ————————————————————————————————————————————————————————————
// The skill's contract: motion explains a complete figure, never supplies it.
// So the static frame must be whole without JS, reduced motion must land on
// that same frame, and the reveal must run once and end complete.

test('the diagram is complete without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('modules/25-serving/');
  await expect(page.locator('.hub-node')).toHaveCount(8);
  const opacities = await page
    .locator('[data-motion-item]')
    .evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
  expect(opacities.every((o) => o === '1')).toBe(true);
  await context.close();
});

test('the reveal runs once and ends complete', async ({ page }) => {
  await page.goto('modules/25-serving/');
  const root = page.locator('[data-motion-root]');
  await root.scrollIntoViewIfNeeded();

  await expect
    .poll(async () => root.getAttribute('class'), { timeout: 5000 })
    .toContain('is-running');
  await expect.poll(async () => root.getAttribute('data-frame'), { timeout: 9000 }).toBe('end');

  const finalOpacities = await page
    .locator('[data-motion-item]')
    .evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
  expect(finalOpacities.every((o) => o === '1')).toBe(true);

  // It never re-runs: scrolling away and back leaves the completed frame.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute('data-frame', 'end');
});

test('reduced motion lands on the complete frame, with no animation', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('modules/25-serving/');
  const root = page.locator('[data-motion-root]');
  await root.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  await expect(root).toHaveAttribute('data-motion-state', 'reduced');
  await expect(root).not.toHaveClass(/motion-ready/);
  const opacities = await page
    .locator('[data-motion-item]')
    .evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
  expect(opacities.every((o) => o === '1')).toBe(true);
  await context.close();
});

test('?motion=static exposes the capture frame', async ({ page }) => {
  await page.goto('modules/25-serving/?motion=static');
  const root = page.locator('[data-motion-root]');
  await root.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await expect(root).toHaveAttribute('data-motion-state', 'static');
  await expect(root).toHaveAttribute('data-frame', 'static');
  await expect(root).not.toHaveClass(/motion-ready/);
});
