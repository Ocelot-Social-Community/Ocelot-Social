import { ocelotIcons } from '#src/ocelot/icons'

import OsActionButton from './OsActionButton.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const iconMap = ocelotIcons
const iconNames = Object.keys(iconMap)

const meta: Meta<typeof OsActionButton> = {
  title: 'Ocelot/ActionButton',
  component: OsActionButton,
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'select',
      options: iconNames,
      mapping: iconMap,
    },
  },
}

export default meta
type Story = StoryObj<typeof OsActionButton>

export const Playground: Story = {
  args: {
    count: 5,
    ariaLabel: 'Like',
    icon: iconMap.heartO,
    filled: false,
    disabled: false,
    loading: false,
  },
}

export const Filled: Story = {
  args: {
    count: 12,
    ariaLabel: 'Liked',
    icon: iconMap.heartO,
    filled: true,
  },
}

export const Loading: Story = {
  args: {
    count: 3,
    ariaLabel: 'Loading',
    icon: iconMap.heartO,
    loading: true,
  },
}

export const Disabled: Story = {
  args: {
    count: 0,
    ariaLabel: 'Disabled',
    icon: iconMap.heartO,
    disabled: true,
  },
}

export const Sizes: Story = {
  render: () => ({
    components: { OsActionButton },
    setup() {
      return { icon: iconMap.heartO }
    },
    template: `
      <div class="flex flex-col gap-6">
        <div>
          <h3 class="text-sm font-bold mb-2">Small (26px button)</h3>
          <!-- The count badge floats above the button (see OsActionButton's
               BADGE_DIAMETER) — pt-4 keeps it clear of the heading above,
               enough even for xl's larger badge. -->
          <div class="pt-4">
            <OsActionButton size="sm" :count="3" aria-label="Like" :icon="icon" />
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Medium (36px button, default)</h3>
          <div class="pt-4">
            <OsActionButton size="md" :count="12" aria-label="Like" :icon="icon" />
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Large (48px button)</h3>
          <div class="pt-4">
            <OsActionButton size="lg" :count="42" aria-label="Like" :icon="icon" />
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Extra Large (56px button)</h3>
          <div class="pt-4">
            <OsActionButton size="xl" :count="128" aria-label="Like" :icon="icon" />
          </div>
        </div>
      </div>
    `,
  }),
}
