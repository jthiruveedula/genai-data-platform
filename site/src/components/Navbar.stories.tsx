import Navbar from './Navbar.astro';

// Phase 0 tooling smoke test — proves Storybook boots against this Astro
// project via @storybook-astro/framework. Navbar takes no props, so this
// is just the default render; not a real visual-review story yet.
export default {
  title: 'Components/Navbar',
  component: Navbar,
};

export const Default = {};
