import { OsIcon } from '#src/components/OsIcon'

import { ocelotIcons } from './index'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta = {
  title: 'Ocelot/Icons',
  tags: ['autodocs'],
}

export default meta

const allEntries = Object.entries(ocelotIcons)

export const AllIcons: StoryObj = {
  render: () => ({
    components: { OsIcon },
    setup() {
      return { allEntries }
    },
    template: `
      <div data-testid="icon-gallery">
        <div class="grid grid-cols-5 gap-4">
          <div v-for="[name, icon] in allEntries" :key="name" class="flex flex-col items-center gap-2 p-3 rounded border border-gray-200">
            <OsIcon :icon="icon" size="xl" />
            <span class="text-xs text-gray-600">{{ name }}</span>
          </div>
        </div>
      </div>
    `,
  }),
}
