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
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Small (26px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton size="sm" variant="default">Default</OsButton>
            <OsButton size="sm" variant="primary">Primary</OsButton>
            <OsButton size="sm" variant="secondary">Secondary</OsButton>
            <OsButton size="sm" variant="danger">Danger</OsButton>
            <OsButton size="sm" variant="warning">Warning</OsButton>
            <OsButton size="sm" variant="success">Success</OsButton>
            <OsButton size="sm" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Medium (36px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton size="md" variant="default">Default</OsButton>
            <OsButton size="md" variant="primary">Primary</OsButton>
            <OsButton size="md" variant="secondary">Secondary</OsButton>
            <OsButton size="md" variant="danger">Danger</OsButton>
            <OsButton size="md" variant="warning">Warning</OsButton>
            <OsButton size="md" variant="success">Success</OsButton>
            <OsButton size="md" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Large</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton size="lg" variant="default">Default</OsButton>
            <OsButton size="lg" variant="primary">Primary</OsButton>
            <OsButton size="lg" variant="secondary">Secondary</OsButton>
            <OsButton size="lg" variant="danger">Danger</OsButton>
            <OsButton size="lg" variant="warning">Warning</OsButton>
            <OsButton size="lg" variant="success">Success</OsButton>
            <OsButton size="lg" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Extra Large</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton size="xl" variant="default">Default</OsButton>
            <OsButton size="xl" variant="primary">Primary</OsButton>
            <OsButton size="xl" variant="secondary">Secondary</OsButton>
            <OsButton size="xl" variant="danger">Danger</OsButton>
            <OsButton size="xl" variant="warning">Warning</OsButton>
            <OsButton size="xl" variant="success">Success</OsButton>
            <OsButton size="xl" variant="info">Info</OsButton>
          </div>
        </div>
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
            <OsButton appearance="filled" variant="secondary">Secondary</OsButton>
            <OsButton appearance="filled" variant="danger">Danger</OsButton>
            <OsButton appearance="filled" variant="warning">Warning</OsButton>
            <OsButton appearance="filled" variant="success">Success</OsButton>
            <OsButton appearance="filled" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Outline</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="outline" variant="default">Default</OsButton>
            <OsButton appearance="outline" variant="primary">Primary</OsButton>
            <OsButton appearance="outline" variant="secondary">Secondary</OsButton>
            <OsButton appearance="outline" variant="danger">Danger</OsButton>
            <OsButton appearance="outline" variant="warning">Warning</OsButton>
            <OsButton appearance="outline" variant="success">Success</OsButton>
            <OsButton appearance="outline" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Ghost</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="ghost" variant="default">Default</OsButton>
            <OsButton appearance="ghost" variant="primary">Primary</OsButton>
            <OsButton appearance="ghost" variant="secondary">Secondary</OsButton>
            <OsButton appearance="ghost" variant="danger">Danger</OsButton>
            <OsButton appearance="ghost" variant="warning">Warning</OsButton>
            <OsButton appearance="ghost" variant="success">Success</OsButton>
            <OsButton appearance="ghost" variant="info">Info</OsButton>
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
