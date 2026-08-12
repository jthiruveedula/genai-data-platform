import { expect, test } from '@playwright/test';

// The wiring block turns claims the prose already made ("Output of Module 15's
// splitter") into links. The risk is a link that points nowhere, or a module
// that renders no wiring at all — both would be silent, so both are tested on
// the real built pages rather than only against the data.

const MODULES = [
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

test('every module shows how it is wired, with a reason per link', async ({ page }) => {
  for (const id of MODULES) {
    await page.goto(`modules/${id}/`);
    const wiring = page.locator('.module-wiring');
    await expect(wiring, `${id} renders a wiring block`).toBeVisible();

    const links = wiring.locator('.wiring-list a');
    const whys = wiring.locator('.wiring-why');
    const count = await links.count();
    expect(count, `${id} wiring has at least one link`).toBeGreaterThan(0);
    // One reason per link: a link without its "why" is just a menu item.
    expect(await whys.count(), `${id} reason count`).toBe(count);
  }
});

test('every wiring link resolves to a real module page', async ({ page, request, baseURL }) => {
  const seen = new Set<string>();
  for (const id of MODULES) {
    await page.goto(`modules/${id}/`);
    const hrefs = await page.locator('.module-wiring .wiring-list a').evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? ''),
    );
    for (const href of hrefs) {
      expect(href, `${id} link shape`).toMatch(/\/modules\/[\w-]+\/$/);
      if (seen.has(href)) continue;
      seen.add(href);
      const response = await request.get(new URL(href, baseURL).toString());
      expect(response.status(), `${href} from ${id}`).toBe(200);
    }
  }
  // The graph should cover most of the curriculum, not one clique of it.
  expect(seen.size).toBeGreaterThanOrEqual(10);
});

test('a wiring link actually navigates', async ({ page }) => {
  await page.goto('modules/45-evaluation/');
  const first = page.locator('.module-wiring .wiring-list a').first();
  const href = await first.getAttribute('href');
  await first.click();
  await expect(page).toHaveURL(new RegExp(`${href}(\\?.*)?$`));
  await expect(page.locator('h1')).toBeVisible();
});
