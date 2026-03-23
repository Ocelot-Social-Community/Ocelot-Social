import { computed } from 'vue'

import OsMenu from './OsMenu.vue'
import OsMenuItem from './OsMenuItem.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const sidebarRoutes = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Settings', path: '/settings' },
  { name: 'Profile', path: '/profile' },
  { name: 'Notifications', path: '/notifications' },
]

const nestedRoutes = [
  { name: 'Home', path: '/' },
  {
    name: 'Posts',
    path: '/posts',
    children: [
      { name: 'All Posts', path: '/posts/all' },
      { name: 'Drafts', path: '/posts/drafts' },
    ],
  },
  { name: 'Users', path: '/users' },
]

const meta: Meta<typeof OsMenu> = {
  title: 'Components/OsMenu',
  component: OsMenu,
  tags: ['autodocs'],
}

export default meta

export const Sidebar: StoryObj = {
  render: () => ({
    components: { OsMenu },
    setup() {
      const routes = computed(() => sidebarRoutes)
      return { routes }
    },
    template: `
      <div style="width: 200px">
        <OsMenu :routes="routes" />
      </div>
    `,
  }),
}

export const SidebarExactMatch: StoryObj = {
  render: () => ({
    components: { OsMenu },
    setup() {
      const routes = computed(() => sidebarRoutes)
      const matcher = (_url: string, route: Record<string, unknown>) => route.path === '/settings'
      return { routes, matcher }
    },
    template: `
      <div style="width: 200px">
        <OsMenu :routes="routes" :matcher="matcher" />
      </div>
    `,
  }),
}

export const NestedRoutes: StoryObj = {
  render: () => ({
    components: { OsMenu },
    setup() {
      const routes = computed(() => nestedRoutes)
      return { routes }
    },
    template: `
      <div style="width: 200px">
        <OsMenu :routes="routes" />
      </div>
    `,
  }),
}

export const CustomMenuItem: StoryObj = {
  render: () => ({
    components: { OsMenu, OsMenuItem },
    setup() {
      const routes = computed(() => [
        { name: 'Edit', path: '/edit', label: 'Edit Item' },
        { name: 'Delete', path: '/delete', label: 'Delete Item' },
        { name: 'Share', path: '/share', label: 'Share Item' },
      ])
      return { routes }
    },
    template: `
      <div style="width: 200px">
        <OsMenu dropdown :routes="routes">
          <template #menuitem="{ route, parents, name }">
            <OsMenuItem :route="route" :parents="parents">
              <strong>{{ route.label }}</strong>
            </OsMenuItem>
          </template>
        </OsMenu>
      </div>
    `,
  }),
}

export const DropdownMenu: StoryObj = {
  render: () => ({
    components: { OsMenu, OsMenuItem },
    setup() {
      const routes = computed(() => [
        { name: 'Option A', label: 'Option A' },
        { name: 'Option B', label: 'Option B' },
        { name: 'Option C', label: 'Option C' },
      ])
      const handleClick = (_e: Event, route: Record<string, unknown>) => {
        // eslint-disable-next-line no-console
        console.log('Selected:', route.label)
      }
      return { routes, handleClick }
    },
    template: `
      <div style="width: 200px; background: white; border: 1px solid #ddd; border-radius: 4px; padding: 4px 0;">
        <OsMenu dropdown :routes="routes">
          <template #menuitem="{ route, parents }">
            <OsMenuItem :route="route" :parents="parents" @click="handleClick">
              {{ route.label }}
            </OsMenuItem>
          </template>
        </OsMenu>
      </div>
    `,
  }),
}
