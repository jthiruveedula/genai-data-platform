import type { StorybookConfig } from '@storybook-astro/framework';

// Phase 0 scaffold: proves Storybook boots against this Astro project.
// Story coverage is intentionally minimal (one component) — later phases
// will grow this as components get ported per the redesign spec.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  framework: {
    name: '@storybook-astro/framework',
    options: {},
  },
};

export default config;
