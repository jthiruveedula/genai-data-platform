import Button from './Button.astro';

// Cloud-theme story variants (data-cloud toolbar toggle) are deferred to
// Phase 3 / Chromatic per the spec — Storybook's global toolbar isn't wired
// up for cloud-flavor switching yet.
export default {
  title: 'Components/UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'link', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    slots: { default: 'Button' },
  },
};

export const Default = {
  args: {
    variant: 'primary',
    size: 'md',
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    slots: { default: 'Primary' },
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    slots: { default: 'Secondary' },
  },
};

export const Ghost = {
  args: {
    variant: 'ghost',
    slots: { default: 'Ghost' },
  },
};

export const Link = {
  args: {
    variant: 'link',
    href: '#',
    slots: { default: 'Link' },
  },
};

export const Destructive = {
  args: {
    variant: 'destructive',
    slots: { default: 'Destructive' },
  },
};

export const Sizes = {
  args: {
    variant: 'primary',
    size: 'lg',
    slots: { default: 'Large' },
  },
};
