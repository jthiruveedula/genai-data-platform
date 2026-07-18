// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://jthiruveedula.github.io',
  base: '/genai-data-platform/',
  integrations: [react()],
  build: {
    // Default ("auto") only inlines stylesheets <=4kB, so BaseLayout's
    // page-wide CSS (~19kB) shipped as a render-blocking <link> on every
    // page — Lighthouse measured ~550ms of blocking time from it alone,
    // pushing the homepage's LCP past the 2.5s budget. Pages here are
    // static output with no cross-page CSS reuse to lose by inlining, so
    // there's no caching downside to trade away.
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Default is 500kb. VectorSpaceScene3D's chunk (three.js +
      // @react-three/fiber + @react-three/drei, ~900kb) trips this on every
      // build — three is a hard dependency of @react-three/fiber regardless
      // of what that component imports, and the chunk is already deferred
      // behind `client:visible` (see VectorSpaceScene3D.astro), so it's
      // never fetched until the learner scrolls that specific module-20
      // scene into view. Raised past that chunk's actual size so the
      // warning only fires for genuinely unexpected bloat elsewhere.
      chunkSizeWarningLimit: 1000,
    },
  },
});
