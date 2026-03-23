import OsMenu from './OsMenu.vue'
import OsMenuItem from './OsMenuItem.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsMenuItem> = {
  title: 'Components/OsMenuItem',
  component: OsMenuItem,
  tags: ['!autodocs', '!dev'],
}

export default meta

const routes = [
  { name: 'Edit', path: '/edit', label: 'Edit Item' },
  { name: 'Delete', path: '/delete', label: 'Delete Item' },
  { name: 'Share', path: '/share', label: 'Share Item' },
]

export const InDropdown: StoryObj = {
  render: () => ({
    components: { OsMenu, OsMenuItem },
    setup() {
      return { routes }
    },
    template: `
      <div style="width: 200px; background: white; border: 1px solid #ddd; border-radius: 4px; padding: 4px 0;">
        <OsMenu dropdown :routes="routes">
          <template #menuitem="{ route, parents }">
            <OsMenuItem :route="route" :parents="parents">
              <strong>{{ route.label }}</strong>
            </OsMenuItem>
          </template>
        </OsMenu>
      </div>
    `,
  }),
}
