import { expect, test } from '@playwright/test';

// The checkpoint quiz is the one place on a module page where the reader does
// something rather than reads something, so the risks are about the doing:
// knowing how far through they are, being able to read an answer without
// crossing the whole screen, and being shown what they got wrong.

const MODULE = 'modules/35-retrieval/';

test('the answered-count tracks as questions are answered', async ({ page }) => {
  await page.goto(MODULE);

  const label = page.locator('[data-quiz-progress-label]');
  const total = await page.locator('[data-quiz-question]').count();
  await expect(label).toHaveText(`0 / ${total} ANSWERED`);

  await page.locator('[data-quiz-question="0"] .quiz-option').first().click();
  await expect(label).toHaveText(`1 / ${total} ANSWERED`);

  await page.locator('[data-quiz-question="1"] .quiz-option').first().click();
  await expect(label).toHaveText(`2 / ${total} ANSWERED`);
  await expect(page.locator('[data-quiz-progress-bar]')).toHaveAttribute('aria-valuenow', '2');
});

test('an answer sits inside a readable measure, not the full page width', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(MODULE);

  const quiz = page.locator('[data-module-quiz]');
  const width = await quiz.evaluate((el) => el.getBoundingClientRect().width);
  // Wide enough to hold a long option on one line, narrow enough to scan.
  expect(width).toBeGreaterThan(600);
  expect(width).toBeLessThan(1100);
});

test('scoring marks every question and brings the first miss into view', async ({ page }) => {
  await page.goto(MODULE);

  const questions = page.locator('[data-quiz-question]');
  const total = await questions.count();
  // Answer every question with the first option, which is wrong at least once
  // on any quiz worth setting.
  for (let i = 0; i < total; i++) {
    await page.locator(`[data-quiz-question="${i}"] .quiz-option`).first().click();
  }

  await page.locator('[data-quiz-submit]').click();

  await expect(page.locator('[data-quiz-result]')).toBeVisible();
  await expect
    .poll(async () => (await page.locator('[data-quiz-result]').innerText()).trim())
    .toMatch(new RegExp(`\\[ (PASS|SCORE) \\d+/${total} \\]`));

  // Every question is marked, and every explanation is readable.
  await expect(page.locator('.quiz-question.is-correct, .quiz-question.is-incorrect')).toHaveCount(total);
  const feedback = page.locator('[data-quiz-feedback]:not([hidden])');
  await expect(feedback).toHaveCount(total);
  await expect(feedback.first()).toBeVisible();

  const firstMiss = page.locator('.quiz-question.is-incorrect').first();
  await expect
    .poll(async () => firstMiss.evaluate((el) => el.getBoundingClientRect().top), { timeout: 5000 })
    .toBeLessThan(900);
});

test('retaking the quiz clears the marking and the answered count', async ({ page }) => {
  await page.goto(MODULE);

  const total = await page.locator('[data-quiz-question]').count();
  for (let i = 0; i < total; i++) {
    await page.locator(`[data-quiz-question="${i}"] .quiz-option`).first().click();
  }
  await page.locator('[data-quiz-submit]').click();
  await expect(page.locator('[data-quiz-retake]')).toBeVisible();

  await page.locator('[data-quiz-retake]').click();
  await expect(page.locator('.quiz-question.is-correct, .quiz-question.is-incorrect')).toHaveCount(0);
  await expect(page.locator('[data-quiz-progress-label]')).toHaveText(`0 / ${total} ANSWERED`);
});
