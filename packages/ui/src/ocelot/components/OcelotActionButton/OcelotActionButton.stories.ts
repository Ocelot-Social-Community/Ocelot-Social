import { ocelotIcons } from '#src/ocelot/icons'

import OcelotActionButton from './OcelotActionButton.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const iconMap = ocelotIcons
const iconNames = Object.keys(iconMap)

const meta: Meta<typeof OcelotActionButton> = {
  title: 'Ocelot/ActionButton',
  component: OcelotActionButton,
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
type Story = StoryObj<typeof OcelotActionButton>

export const Default: Story = {
  args: {
    count: 5,
    ariaLabel:'Like',
    icon: iconMap.heartO,
    filled: false,
    disabled: false,
    loading: false,
  },
}

export const Filled: Story = {
  args: {
    count: 12,
    ariaLabel:'Liked',
    icon: iconMap.heartO,
    filled: true,
  },
}

export const Loading: Story = {
  args: {
    count: 3,
    ariaLabel:'Loading',
    icon: iconMap.heartO,
    loading: true,
  },
}

export const Disabled: Story = {
  args: {
    count: 0,
    ariaLabel:'Disabled',
    icon: iconMap.heartO,
    disabled: true,
  },
}
