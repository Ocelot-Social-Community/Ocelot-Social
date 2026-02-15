import { computed, h } from 'vue'

import { SYSTEM_ICONS } from './icons'
import OsIcon from './OsIcon.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsIcon> = {
  title: 'Components/OsIcon',
  component: OsIcon,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OsIcon>

const iconNames = Object.keys(SYSTEM_ICONS)

const HeartIcon = () =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor' }, [
    h('path', {
      d: 'M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.837-2.194C3.614 12.186 2 10.114 2 7.5A4.5 4.5 0 016.5 3c1.279 0 2.374.612 3.149 1.469C10.376 3.612 11.471 3 12.75 3A4.5 4.5 0 0117.25 7.5c0 2.614-1.614 4.686-3.63 6.526a22.045 22.045 0 01-2.837 2.194 20.759 20.759 0 01-1.162.682l-.019.01-.005.003h-.002L9.653 16.915z',
    }),
  ])

interface PlaygroundArgs {
  name: string
  size: string
  ariaLabel: string
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    name: {
      control: 'select',
      options: iconNames,
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
    },
    ariaLabel: {
      control: 'text',
    },
  },
  args: {
    name: 'close',
    size: 'md',
    ariaLabel: '',
  },
  render: (args) => ({
    components: { OsIcon },
    setup() {
      const iconProps = computed(() => ({
        name: args.name,
        size: args.size,
      }))
      const ariaLabel = computed(() => args.ariaLabel || undefined)
      return { iconProps, ariaLabel }
    },
    template: `<OsIcon v-bind="iconProps" :aria-label="ariaLabel" />`,
  }),
}

export const AllSystemIcons: Story = {
  render: () => ({
    components: { OsIcon },
    setup() {
      return { iconNames }
    },
    template: `
      <div class="grid grid-cols-5 gap-4">
        <div v-for="name in iconNames" :key="name" class="flex flex-col items-center gap-2 p-3 rounded border border-gray-200">
          <OsIcon :name="name" size="xl" />
          <span class="text-xs text-gray-600">{{ name }}</span>
        </div>
      </div>
    `,
  }),
}

export const AllSizes: Story = {
  render: () => ({
    components: { OsIcon },
    template: `
      <div data-testid="all-sizes" class="flex items-end gap-4">
        <div class="flex flex-col items-center gap-1">
          <OsIcon name="check" size="xs" />
          <span class="text-xs text-gray-500">xs</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <OsIcon name="check" size="sm" />
          <span class="text-xs text-gray-500">sm</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <OsIcon name="check" size="md" />
          <span class="text-xs text-gray-500">md</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <OsIcon name="check" size="lg" />
          <span class="text-xs text-gray-500">lg</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <OsIcon name="check" size="xl" />
          <span class="text-xs text-gray-500">xl</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <OsIcon name="check" size="2xl" />
          <span class="text-xs text-gray-500">2xl</span>
        </div>
      </div>
    `,
  }),
}

export const CustomComponent: Story = {
  render: () => ({
    components: { OsIcon },
    setup() {
      return { HeartIcon }
    },
    template: `
      <div data-testid="custom-component" class="flex items-center gap-4">
        <OsIcon :icon="HeartIcon" size="md" />
        <OsIcon :icon="HeartIcon" size="lg" />
        <OsIcon :icon="HeartIcon" size="xl" />
      </div>
    `,
  }),
}

export const InheritColor: Story = {
  render: () => ({
    components: { OsIcon },
    template: `
      <div data-testid="inherit-color" class="flex items-center gap-4 text-lg">
        <span class="text-red-500"><OsIcon name="close" /></span>
        <span class="text-green-500"><OsIcon name="check" /></span>
        <span class="text-blue-500"><OsIcon name="plus" /></span>
      </div>
    `,
  }),
}
