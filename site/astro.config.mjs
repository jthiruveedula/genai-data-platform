// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://jthiruveedula.github.io',
  base: '/genai-data-platform/',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
