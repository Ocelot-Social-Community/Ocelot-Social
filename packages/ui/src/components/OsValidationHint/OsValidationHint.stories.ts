import OsValidationHint from './OsValidationHint.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsValidationHint> = {
  title: 'Components/OsValidationHint',
  component: OsValidationHint,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [null, 'warning', 'error'],
    },
    text: { control: 'text' },
    count: { control: 'number' },
    max: { control: 'number' },
  },
}

export default meta
type Story = StoryObj<typeof OsValidationHint>

export const Playground: Story = {
  args: {
    variant: 'error',
    text: 'This field is required.',
    count: undefined,
    max: undefined,
  },
}

export const ErrorWithText: Story = {
  render: () => ({
    components: { OsValidationHint },
    template: `
      <OsValidationHint variant="error" text="This field is required." />
    `,
  }),
}

export const WarningWithText: Story = {
  render: () => ({
    components: { OsValidationHint },
    template: `
      <OsValidationHint variant="warning" text="Event start date is in the past." />
    `,
  }),
}

export const CounterOnly: Story = {
  render: () => ({
    components: { OsValidationHint },
    template: `
      <div class="flex flex-col gap-3">
        <OsValidationHint :count="42" :max="100" />
        <OsValidationHint :count="95" :max="100" />
        <OsValidationHint variant="error" :count="120" :max="100" text="Character limit exceeded." />
      </div>
    `,
  }),
}

export const ErrorWithCountAndText: Story = {
  render: () => ({
    components: { OsValidationHint },
    template: `
      <OsValidationHint
        variant="error"
        text="Character limit exceeded."
        :count="120"
        :max="100"
      />
    `,
  }),
}

export const WarningWithCount: Story = {
  render: () => ({
    components: { OsValidationHint },
    template: `
      <OsValidationHint
        variant="warning"
        text="Almost at the limit."
        :count="95"
        :max="100"
      />
    `,
  }),
}

export const BadgeOnly: Story = {
  render: () => ({
    components: { OsValidationHint },
    template: `
      <div class="flex flex-col gap-3">
        <OsValidationHint variant="error" />
        <OsValidationHint variant="warning" />
      </div>
    `,
  }),
}

export const AllVariants: Story = {
  render: () => ({
    components: { OsValidationHint },
    template: `
      <div data-testid="all-variants" class="flex flex-col gap-4 p-4 max-w-md">
        <div>
          <p class="text-xs text-gray-500 mb-1">Counter (neutral):</p>
          <OsValidationHint :count="42" :max="100" />
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Warning:</p>
          <OsValidationHint variant="warning" text="Event start date is in the past." />
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Error:</p>
          <OsValidationHint variant="error" text="This field is required." />
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Error with counter:</p>
          <OsValidationHint variant="error" text="Character limit exceeded." :count="120" :max="100" />
        </div>
      </div>
    `,
  }),
}
