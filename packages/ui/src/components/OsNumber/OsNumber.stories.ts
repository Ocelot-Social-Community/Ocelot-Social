import { computed } from 'vue'

import OsNumber from './OsNumber.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsNumber> = {
  title: 'Components/OsNumber',
  component: OsNumber,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OsNumber>

interface PlaygroundArgs {
  count: number
  label: string
  animated: boolean
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    count: {
      control: 'number',
    },
    label: {
      control: 'text',
    },
    animated: {
      control: 'boolean',
    },
  },
  args: {
    count: 42,
    label: 'Followers',
    animated: false,
  },
  render: (args) => ({
    components: { OsNumber },
    setup() {
      const numberProps = computed(() => ({
        count: args.count,
        label: args.label,
        animated: args.animated,
      }))
      return { numberProps }
    },
    template: `<OsNumber v-bind="numberProps" />`,
  }),
}

export const StaticCount: Story = {
  render: () => ({
    components: { OsNumber },
    template: `
      <div data-testid="static-count" class="flex items-center gap-8">
        <OsNumber :count="0" />
        <OsNumber :count="42" />
        <OsNumber :count="1337" />
      </div>
    `,
  }),
}

export const WithLabel: Story = {
  render: () => ({
    components: { OsNumber },
    template: `
      <div data-testid="with-label" class="flex items-center gap-8">
        <OsNumber :count="12" label="Posts" />
        <OsNumber :count="42" label="Followers" />
        <OsNumber :count="7" label="Following" />
      </div>
    `,
  }),
}

export const Animated: Story = {
  render: () => ({
    components: { OsNumber },
    template: `
      <div data-testid="animated" class="flex items-center gap-8">
        <OsNumber :count="128" label="Posts" :animated="true" />
      </div>
    `,
  }),
}

export const MultipleCounters: Story = {
  render: () => ({
    components: { OsNumber },
    template: `
      <div data-testid="multiple-counters" class="flex items-center gap-8">
        <OsNumber :count="156" label="Users" />
        <OsNumber :count="42" label="Posts" />
        <OsNumber :count="7" label="Comments" />
        <OsNumber :count="3" label="Groups" />
      </div>
    `,
  }),
}
