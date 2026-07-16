// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://jthiruveedula.github.io',
  base: '/genai-data-platform/',
  vite: {
    plugins: [tailwindcss()],
  },
});
