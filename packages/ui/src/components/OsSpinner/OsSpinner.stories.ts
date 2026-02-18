import { computed } from 'vue'

import OsSpinner from './OsSpinner.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsSpinner> = {
  title: 'Components/OsSpinner',
  component: OsSpinner,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OsSpinner>

interface PlaygroundArgs {
  size: string
  ariaLabel: string
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
    },
    ariaLabel: {
      control: 'text',
    },
  },
  args: {
    size: 'md',
    ariaLabel: 'Loading',
  },
  render: (args) => ({
    components: { OsSpinner },
    setup() {
      const spinnerProps = computed(() => ({
        size: args.size,
      }))
      const ariaLabel = computed(() => args.ariaLabel || undefined)
      return { spinnerProps, ariaLabel }
    },
    template: `<OsSpinner v-bind="spinnerProps" :aria-label="ariaLabel" />`,
  }),
}

export const AllSizes: Story = {
  render: () => ({
    components: { OsSpinner },
    template: `
      <div data-testid="all-sizes" class="flex items-end gap-6">
        <div class="flex flex-col items-center gap-2">
          <OsSpinner size="xs" />
          <span class="text-xs text-gray-500">xs</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <OsSpinner size="sm" />
          <span class="text-xs text-gray-500">sm</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <OsSpinner size="md" />
          <span class="text-xs text-gray-500">md</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <OsSpinner size="lg" />
          <span class="text-xs text-gray-500">lg</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <OsSpinner size="xl" />
          <span class="text-xs text-gray-500">xl</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <OsSpinner size="2xl" />
          <span class="text-xs text-gray-500">2xl</span>
        </div>
      </div>
    `,
  }),
}

export const InheritColor: Story = {
  render: () => ({
    components: { OsSpinner },
    template: `
      <div data-testid="inherit-color" class="flex items-center gap-6 text-lg">
        <span class="text-red-500"><OsSpinner size="lg" aria-label="Error loading" /></span>
        <span class="text-green-500"><OsSpinner size="lg" aria-label="Success loading" /></span>
        <span class="text-blue-500"><OsSpinner size="lg" aria-label="Info loading" /></span>
        <span class="text-gray-400"><OsSpinner size="lg" aria-label="Default loading" /></span>
      </div>
    `,
  }),
}

export const InlineWithText: Story = {
  render: () => ({
    components: { OsSpinner },
    template: `
      <div data-testid="inline-text" class="flex flex-col gap-4">
        <p class="text-sm flex items-center gap-2">
          <OsSpinner size="sm" /> Loading results...
        </p>
        <p class="text-base flex items-center gap-2">
          <OsSpinner size="md" /> Processing your request...
        </p>
        <p class="text-lg flex items-center gap-2">
          <OsSpinner size="lg" /> Please wait...
        </p>
      </div>
    `,
  }),
}
