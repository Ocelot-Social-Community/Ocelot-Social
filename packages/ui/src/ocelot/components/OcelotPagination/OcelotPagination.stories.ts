import { SYSTEM_ICONS } from '#src/components/OsIcon'

import OcelotPagination from './OcelotPagination.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OcelotPagination> = {
  title: 'Ocelot/Pagination',
  component: OcelotPagination,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OcelotPagination>

export const Default: Story = {
  args: {
    iconPrevious: SYSTEM_ICONS.close,
    iconNext: SYSTEM_ICONS.check,
    hasPrevious: true,
    hasNext: true,
    labelPrevious: 'Previous',
    labelNext: 'Next',
  },
}

export const WithPageCounter: Story = {
  args: {
    iconPrevious: SYSTEM_ICONS.close,
    iconNext: SYSTEM_ICONS.check,
    hasPrevious: true,
    hasNext: true,
    showPageCounter: true,
    activePage: 2,
    pageSize: 10,
    activeResourceCount: 50,
    pageLabel: 'Page',
  },
}

export const FirstPage: Story = {
  args: {
    iconPrevious: SYSTEM_ICONS.close,
    iconNext: SYSTEM_ICONS.check,
    hasPrevious: false,
    hasNext: true,
    showPageCounter: true,
    activePage: 0,
    pageSize: 10,
    activeResourceCount: 30,
    pageLabel: 'Page',
  },
}

export const LastPage: Story = {
  args: {
    iconPrevious: SYSTEM_ICONS.close,
    iconNext: SYSTEM_ICONS.check,
    hasPrevious: true,
    hasNext: false,
    showPageCounter: true,
    activePage: 2,
    pageSize: 10,
    activeResourceCount: 30,
    pageLabel: 'Page',
  },
}
