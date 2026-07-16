import { defineConfig } from 'vitest/config';

// Phase 0 scaffold. Astro components can't be unit-rendered here — there's
// no maintained @testing-library/astro (checked: doesn't exist on npm as of
// this writing) and Astro's own component-testing story is still limited.
// So this covers plain TS/JS utils and data-shape checks only; component
// behavior stays covered by the Playwright e2e smoke test instead.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
