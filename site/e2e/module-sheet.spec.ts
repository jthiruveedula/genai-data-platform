import { expect, test } from '@playwright/test';

// Below 1024px the tick rail hides itself — there is no page edge to put ticks
// in — which used to leave a phone with no section navigation at all on a page
// that scrolls for six or seven screens. The sheet is that navigation, so the
// risks are: it doesn't appear where it is needed, it appears where it isn't,
// it names the wrong section, or its jump doesn't land.

const MODULE = 'modules/35-retrieval/';
const PHONE = { width: 390, height: 780 };

test('the sheet takes over exactly where the tick rail gives up', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(MODULE);
  await expect(page.locator('[data-section-sheet]')).toBeVisible();
  await expect(page.locator('[data-section-rail]')).toBeHidden();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('[data-section-sheet]')).toBeHidden();
  await expect(page.locator('[data-section-rail]')).toBeVisible();
});

test('the pill names the section being read', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(MODULE);

  const headings = page.locator('article h2');
  const total = await headings.count();
  const current = page.locator('[data-sheet-current]');
  await expect(current).toHaveText((await headings.first().innerText()).trim());
  await expect(page.locator('[data-sheet-count]')).toHaveText(`1/${total}`);

  const third = (await headings.nth(2).innerText()).trim();
  await headings.nth(2).evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect.poll(async () => current.innerText(), { timeout: 5000 }).toBe(third);
  await expect(page.locator('[data-sheet-count]')).toHaveText(`3/${total}`);
});

test('one tap opens the list, and it lists every section once', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(MODULE);

  const toggle = page.locator('[data-sheet-toggle]');
  const list = page.locator('[data-sheet-list]');
  await expect(list).toBeHidden();

  await toggle.click();
  await expect(list).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  const headings = await page.locator('article h2').allInnerTexts();
  const items = list.locator('button');
  await expect(items).toHaveCount(headings.length);

  await toggle.click();
  await expect(list).toBeHidden();
});

test('choosing a section closes the sheet and goes there', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(MODULE);

  await page.locator('[data-sheet-toggle]').click();
  const target = page.locator('article h2').nth(3);
  const title = (await target.innerText()).trim();
  await page.locator('[data-sheet-list] button').nth(3).click();

  await expect(page.locator('[data-sheet-list]')).toBeHidden();
  await expect
    .poll(async () => target.evaluate((el) => Math.round(el.getBoundingClientRect().top)), { timeout: 5000 })
    .toBeLessThan(220);
  await expect.poll(async () => page.locator('[data-sheet-current]').innerText()).toBe(title);
});

test('Escape closes the sheet and returns focus to the pill', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(MODULE);

  const toggle = page.locator('[data-sheet-toggle]');
  await toggle.click();
  await expect(page.locator('[data-sheet-list]')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('[data-sheet-list]')).toBeHidden();
  await expect(toggle).toBeFocused();
});
