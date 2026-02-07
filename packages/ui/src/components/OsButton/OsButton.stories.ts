import OsButton from './OsButton.vue'

import type { Meta, StoryObj } from '@storybook/vue3'

const meta: Meta<typeof OsButton> = {
  title: 'Components/OsButton',
  component: OsButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'warning', 'success', 'info', 'ghost', 'outline'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    fullWidth: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof OsButton>

export const Primary: Story = {
  args: {
    variant: 'primary',
    default: 'Primary Button',
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">{{ args.default }}</OsButton>',
  }),
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    default: 'Secondary Button',
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">{{ args.default }}</OsButton>',
  }),
}

export const Danger: Story = {
  args: {
    variant: 'danger',
    default: 'Danger Button',
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">{{ args.default }}</OsButton>',
  }),
}

export const AllVariants: Story = {
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-wrap gap-2">
        <OsButton variant="primary">Primary</OsButton>
        <OsButton variant="secondary">Secondary</OsButton>
        <OsButton variant="danger">Danger</OsButton>
        <OsButton variant="warning">Warning</OsButton>
        <OsButton variant="success">Success</OsButton>
        <OsButton variant="info">Info</OsButton>
        <OsButton variant="ghost">Ghost</OsButton>
        <OsButton variant="outline">Outline</OsButton>
      </div>
    `,
  }),
}

export const AllSizes: Story = {
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-col gap-2 items-start">
        <OsButton size="xs">Extra Small</OsButton>
        <OsButton size="sm">Small</OsButton>
        <OsButton size="md">Medium</OsButton>
        <OsButton size="lg">Large</OsButton>
        <OsButton size="xl">Extra Large</OsButton>
      </div>
    `,
  }),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    default: 'Disabled Button',
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">{{ args.default }}</OsButton>',
  }),
}

export const FullWidth: Story = {
  args: {
    fullWidth: true,
    default: 'Full Width Button',
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">{{ args.default }}</OsButton>',
  }),
}
