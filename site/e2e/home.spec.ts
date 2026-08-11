import { expect, test } from '@playwright/test';

// The homepage — the scroll-driven platform story. Covers structure, the
// global cloud switcher, the hand-off into the real curriculum, and the
// reduced-motion split (scroll-driven position keeps tracking; only idle
// motion and auto-run stop).

test('renders all thirteen sections and mounts the hero WebGL scene', async ({ page }) => {
  await page.goto('');
  await expect(page).toHaveTitle(/GenAI Data Platform/);
  for (const id of ['top', 'lifecycle', 'agent', 'integrate', 'stacks', 'operate', 'curriculum', 'cost']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  await expect(page.locator('.pf-hero__canvas canvas')).toBeVisible();
  await expect(page.locator('[data-pf-pipe-label]')).toHaveCount(10);
  await expect(page.locator('[data-pf-life-card]')).toHaveCount(10);
  await expect(page.locator('[data-pf-cur-card]')).toHaveCount(12);
});

test('the curriculum track links to the twelve module pages', async ({ page }) => {
  await page.goto('');
  const first = page.locator('[data-pf-cur-card]').first();
  await expect(first).toHaveAttribute('href', /\/modules\/00-foundations\/$/);
  await expect(page.locator('[data-pf-cur-card]').last()).toHaveAttribute(
    'href',
    /\/modules\/85-agents\/$/,
  );
  // The footer hands off to the rest of the site.
  await expect(page.locator('.pf-sitelinks a')).toHaveCount(9);
});

test('the cloud switcher re-maps every service label from one selection', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('[data-pf-hero-stack]')).toHaveText('Vertex AI + BigQuery');

  await page.locator('[data-pf-cloud="3"]').click();

  await expect(page.locator('[data-pf-hero-stack]')).toHaveText('Azure OpenAI + AI Search');
  await expect(page.locator('[data-pf-life-onlabel]')).toHaveText('ON AZURE →');
  await expect(page.locator('[data-pf-map-value]').first()).toHaveText('Azure AI Search');
  await expect(page.locator('[data-pf-agent-stack]').first()).toHaveText(
    'Azure AI Foundry Agent Service',
  );
  // The cost row for the selected cloud takes the accent tint.
  await expect(page.locator('[data-pf-cost-row]').nth(2)).toHaveClass(/is-active/);
  // Selecting a flavor card sets the same global value.
  await page.locator('[data-pf-flavor="4"]').click();
  await expect(page.locator('[data-pf-hero-stack]')).toHaveText('vLLM + Qdrant on K8s');
});

test('the accent re-tints to the selected cloud', async ({ page }) => {
  await page.goto('');
  const accent = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
    );

  expect(await accent()).toBe('#1a56c4');
  await page.locator('[data-pf-cloud="2"]').click();
  expect(await page.evaluate(() => document.documentElement.dataset.pfCloud)).toBe('aws');
  expect(await accent()).toBe('#a85900');
  await page.locator('[data-pf-cloud="4"]').click();
  expect(await accent()).toBe('#12712f');
});

test('clicking an agent row takes manual control of the loop', async ({ page }) => {
  await page.goto('');
  await page.locator('#agent').scrollIntoViewIfNeeded();
  await page.locator('[data-pf-agent-row="1"]').click();
  await expect(page.locator('[data-pf-agent-row="1"]')).toHaveClass(/is-active/);
  // userPicked latches auto-run off, so the selection survives the RAF loop.
  await page.waitForTimeout(2000);
  await expect(page.locator('[data-pf-agent-row="1"]')).toHaveClass(/is-active/);
});

test('selecting an integration system swaps the call signature', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('[data-pf-call]')).toHaveText('mcp.call("tickets.search", { q, scope: tenant })');
  await page.locator('[data-pf-sys="2"]').click();
  await expect(page.locator('[data-pf-call]')).toHaveText('POST /erp/hooks/agent — signed, replay-protected');
});

test('under reduced motion the scroll-driven stage index still tracks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  await expect(page.locator('[data-pf-life-num]')).toHaveText('01');

  // Two-thirds down the lifecycle section: the story must stay navigable.
  await page.evaluate(() => {
    const el = document.querySelector('#lifecycle') as HTMLElement;
    window.scrollTo({ top: el.offsetTop + el.offsetHeight * 0.66, behavior: 'instant' });
  });
  await expect(page.locator('[data-pf-life-num]')).not.toHaveText('01');
});
