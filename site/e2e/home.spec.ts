import { expect, test } from '@playwright/test';

// Phase 0 smoke test: confirms the built site actually serves and renders
// the homepage shell (title + nav). Not a full e2e suite yet.
test('homepage renders title and nav', async ({ page }) => {
  // baseURL already includes the astro.config `base` path
  // (/genai-data-platform/); goto('/') would override it, so use ''.
  await page.goto('');

  await expect(page).toHaveTitle(/GenAI Data Platform/);
  await expect(page.locator('header.navbar')).toBeVisible();
  await expect(page.locator('header.navbar .brand')).toHaveText('GenAI Data Platform');
});
