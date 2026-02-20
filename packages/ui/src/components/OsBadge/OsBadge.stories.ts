import { computed } from 'vue'

import OsBadge from './OsBadge.vue'

import type { BadgeShape, BadgeSize, BadgeVariant } from './badge.variants'
import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsBadge> = {
  title: 'Components/OsBadge',
  component: OsBadge,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OsBadge>

interface PlaygroundArgs {
  variant: BadgeVariant
  size: BadgeSize
  shape: BadgeShape
  content: string
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    shape: {
      control: 'select',
      options: ['pill', 'square'],
    },
    content: {
      control: 'text',
    },
  },
  args: {
    variant: 'default',
    size: 'sm',
    shape: 'pill',
    content: 'Badge',
  },
  render: (args) => ({
    components: { OsBadge },
    setup() {
      const badgeProps = computed(() => ({
        variant: args.variant,
        size: args.size,
        shape: args.shape,
      }))
      const content = computed(() => args.content)
      return { badgeProps, content }
    },
    template: `<OsBadge v-bind="badgeProps">{{ content }}</OsBadge>`,
  }),
}

export const AllVariants: Story = {
  render: () => ({
    components: { OsBadge },
    template: `
      <div data-testid="all-variants" class="flex items-center gap-3">
        <OsBadge variant="default">Default</OsBadge>
        <OsBadge variant="primary">Primary</OsBadge>
        <OsBadge variant="danger">Danger</OsBadge>
      </div>
    `,
  }),
}

export const AllSizes: Story = {
  render: () => ({
    components: { OsBadge },
    template: `
      <div data-testid="all-sizes" class="flex items-end gap-3">
        <div class="flex flex-col items-center gap-2">
          <OsBadge size="sm">Small</OsBadge>
          <span class="text-xs text-gray-500">sm</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <OsBadge size="md">Medium</OsBadge>
          <span class="text-xs text-gray-500">md</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <OsBadge size="lg">Large</OsBadge>
          <span class="text-xs text-gray-500">lg</span>
        </div>
      </div>
    `,
  }),
}

export const AllShapes: Story = {
  render: () => ({
    components: { OsBadge },
    template: `
      <div data-testid="all-shapes" class="flex items-center gap-3">
        <OsBadge shape="pill">Pill</OsBadge>
        <OsBadge shape="square">Square</OsBadge>
      </div>
    `,
  }),
}

export const FormCounter: Story = {
  render: () => ({
    components: { OsBadge },
    template: `
      <div data-testid="form-counter" class="flex flex-col gap-3">
        <p class="text-sm text-gray-500 m-0">Valid counter:</p>
        <OsBadge size="md">42/100</OsBadge>
        <p class="text-sm text-gray-500 m-0">Error counter (danger):</p>
        <OsBadge size="md" variant="danger">105/100 ⚠</OsBadge>
        <p class="text-sm text-gray-500 m-0">Default with counter (form idle):</p>
        <OsBadge size="md" variant="default">0/100</OsBadge>
      </div>
    `,
  }),
}

export const WithIcon: Story = {
  render: () => ({
    components: { OsBadge },
    template: `
      <div data-testid="with-icon" class="flex items-center gap-3">
        <OsBadge variant="primary">
          <span style="margin-right: 4px">✓</span> Verified
        </OsBadge>
        <OsBadge variant="danger">
          <span style="margin-right: 4px">⚠</span> Error
        </OsBadge>
      </div>
    `,
  }),
}
