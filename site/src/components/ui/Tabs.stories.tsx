import Tabs from './Tabs.astro';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'settings', label: 'Settings' },
];

// Cloud-theme story variants (data-cloud toolbar toggle) are deferred to
// Phase 3 / Chromatic per the spec — Storybook's global toolbar isn't wired
// up for cloud-flavor switching yet.
export default {
  title: 'Components/UI/Tabs',
  component: Tabs,
  argTypes: {
    variant: {
      control: 'select',
      options: ['line', 'enclosed', 'soft'],
    },
  },
  args: {
    tabs,
    slots: {
      overview: 'Overview panel content.',
      details: 'Details panel content.',
      settings: 'Settings panel content.',
    },
  },
};

export const Default = {
  args: {
    variant: 'line',
  },
};

export const Line = {
  args: {
    variant: 'line',
  },
};

export const Enclosed = {
  args: {
    variant: 'enclosed',
  },
};

export const Soft = {
  args: {
    variant: 'soft',
  },
};
