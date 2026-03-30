import { ocelotIcons } from '#src/ocelot/icons'

import OsCounterIcon from './OsCounterIcon.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const iconMap = ocelotIcons
const iconNames = Object.keys(iconMap)

const meta: Meta<typeof OsCounterIcon> = {
  title: 'Ocelot/CounterIcon',
  component: OsCounterIcon,
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
type Story = StoryObj<typeof OsCounterIcon>

export const Playground: Story = {
  args: {
    count: 3,
    icon: iconMap.bell,
    danger: false,
    soft: false,
  },
}

export const Danger: Story = {
  args: {
    count: 42,
    icon: iconMap.bell,
    danger: true,
  },
}

export const Soft: Story = {
  args: {
    count: 7,
    icon: iconMap.comments,
    soft: true,
  },
}

export const Capped: Story = {
  args: {
    count: 150,
    icon: iconMap.bell,
  },
}

export const Zero: Story = {
  args: {
    count: 0,
    icon: iconMap.bell,
  },
}
