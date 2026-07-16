import Card from './Card.astro';

// Cloud-theme story variants (data-cloud toolbar toggle) are deferred to
// Phase 3 / Chromatic per the spec — Storybook's global toolbar isn't wired
// up for cloud-flavor switching yet.
export default {
  title: 'Components/UI/Card',
  component: Card,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined'],
    },
  },
  args: {
    slots: { default: 'Card content goes here.' },
  },
};

export const Default = {
  args: {
    variant: 'default',
  },
};

export const Elevated = {
  args: {
    variant: 'elevated',
  },
};

export const Outlined = {
  args: {
    variant: 'outlined',
  },
};
