import OsButton from './OsButton.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsButton> = {
  title: 'Components/OsButton',
  component: OsButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'danger', 'warning', 'success', 'info'],
    },
    appearance: {
      control: 'select',
      options: ['filled', 'outline', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
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
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">Primary Button</OsButton>',
  }),
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">Secondary Button</OsButton>',
  }),
}

export const Danger: Story = {
  args: {
    variant: 'danger',
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">Danger Button</OsButton>',
  }),
}

export const Default: Story = {
  args: {
    variant: 'default',
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">Default Button</OsButton>',
  }),
}

export const AllVariants: Story = {
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-wrap gap-2">
        <OsButton variant="default">Default</OsButton>
        <OsButton variant="primary">Primary</OsButton>
        <OsButton variant="secondary">Secondary</OsButton>
        <OsButton variant="danger">Danger</OsButton>
        <OsButton variant="warning">Warning</OsButton>
        <OsButton variant="success">Success</OsButton>
        <OsButton variant="info">Info</OsButton>
      </div>
    `,
  }),
}

export const AllSizes: Story = {
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-col gap-2 items-start">
        <OsButton size="sm">Small (26px)</OsButton>
        <OsButton size="md">Medium (36px)</OsButton>
        <OsButton size="lg">Large</OsButton>
        <OsButton size="xl">Extra Large</OsButton>
      </div>
    `,
  }),
}

export const Outline: Story = {
  args: {
    appearance: 'outline',
    variant: 'primary',
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">Outline Button</OsButton>',
  }),
}

export const Ghost: Story = {
  args: {
    appearance: 'ghost',
    variant: 'primary',
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">Ghost Button</OsButton>',
  }),
}

export const AllAppearances: Story = {
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Filled (default)</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="filled" variant="default">Default</OsButton>
            <OsButton appearance="filled" variant="primary">Primary</OsButton>
            <OsButton appearance="filled" variant="danger">Danger</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Outline</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="outline" variant="default">Default</OsButton>
            <OsButton appearance="outline" variant="primary">Primary</OsButton>
            <OsButton appearance="outline" variant="danger">Danger</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Ghost</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="ghost" variant="default">Default</OsButton>
            <OsButton appearance="ghost" variant="primary">Primary</OsButton>
            <OsButton appearance="ghost" variant="danger">Danger</OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">Disabled Button</OsButton>',
  }),
}

export const FullWidth: Story = {
  args: {
    fullWidth: true,
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      return { args }
    },
    template: '<OsButton v-bind="args">Full Width Button</OsButton>',
  }),
}
