import { OsIcon, SYSTEM_ICONS } from '#src/components/OsIcon'

import { ocelotIcons } from './index'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta = {
  title: 'Ocelot/Icons',
  tags: ['autodocs'],
}

export default meta

const systemEntries = Object.entries(SYSTEM_ICONS)
const ocelotEntries = Object.entries(ocelotIcons)

export const AllIcons: StoryObj = {
  render: () => ({
    components: { OsIcon },
    setup() {
      return { systemEntries, ocelotEntries }
    },
    template: `
      <div class="flex flex-col gap-6">
        <div>
          <h3 class="text-sm font-bold mb-2">Library Icons</h3>
          <div class="grid grid-cols-5 gap-4">
            <div v-for="[name, icon] in systemEntries" :key="name" class="flex flex-col items-center gap-2 p-3 rounded border border-gray-200">
              <OsIcon :icon="icon" size="xl" />
              <span class="text-xs text-gray-600">{{ name }}</span>
            </div>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Ocelot Icons</h3>
          <div class="grid grid-cols-5 gap-4">
            <div v-for="[name, icon] in ocelotEntries" :key="name" class="flex flex-col items-center gap-2 p-3 rounded border border-gray-200">
              <OsIcon :icon="icon" size="xl" />
              <span class="text-xs text-gray-600">{{ name }}</span>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
}
