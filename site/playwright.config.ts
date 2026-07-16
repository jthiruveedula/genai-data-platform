import { defineConfig } from '@playwright/test';

// Phase 0 scaffold: one smoke test against the built site served via
// `astro preview` (matches production output/base path, unlike `astro dev`).
const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}/genai-data-platform/`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
  },
  webServer: {
    command: 'npm run preview -- --port 4321',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
