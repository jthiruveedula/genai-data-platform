import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// PLAN.md §8/§10 requires an a11y CI gate ("pa11y-ci on key pages") and a
// WCAG 4.5:1 contrast audit across all 8 theme combos — neither existed as
// an enforced check before this spec. axe-core covers both (contrast is one
// of its WCAG 2 AA rules) using tooling already in this repo's stack
// (Playwright), so it runs as a real e2e scan against the production build
// rather than a second, separately-configured tool.
//
// Scanned against all 4 cloud themes (data-cloud drives which --accent is
// active) so a flavor-specific contrast regression can't slip through.
const KEY_PAGES = [
  '',
  'modules/00-foundations/',
  'modules/45-evaluation/',
  'matrix/',
  'freshness/',
  'paths/beginner/',
  'calculator/',
  'this-page-does-not-exist/',
];

const CLOUDS = ['gcp', 'aws', 'azure', 'oss'] as const;

for (const path of KEY_PAGES) {
  for (const cloud of CLOUDS) {
    test(`${path || 'home'} has no WCAG 2 AA violations (${cloud} theme)`, async ({ page }) => {
      // BaseLayout's scroll-reveal GSAP timelines animate opacity/transform on
      // scroll and explicitly skip themselves under reduced motion (see
      // setupScrollEffects's `if (reducedMotion) return`). Without this,
      // axe can scan elements mid-transition (e.g. opacity: 0.53) and report
      // a false contrast violation against a state no user ever rests on.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await page.evaluate((c) => document.documentElement.setAttribute('data-cloud', c), cloud);

      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

      expect(
        results.violations,
        results.violations.map((v) => `${v.id}: ${v.description}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`).join('\n\n'),
      ).toEqual([]);
    });
  }
}
