import { IconCheck, IconPlus } from '#src/components/OsIcon'

import OcelotActionButton from './OcelotActionButton.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OcelotActionButton> = {
  title: 'Ocelot/ActionButton',
  component: OcelotActionButton,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OcelotActionButton>

export const Default: Story = {
  args: {
    count: 5,
    text: 'Like',
    icon: IconCheck,
    filled: false,
    disabled: false,
    loading: false,
  },
}

export const Filled: Story = {
  args: {
    count: 12,
    text: 'Liked',
    icon: IconCheck,
    filled: true,
  },
}

export const Loading: Story = {
  args: {
    count: 3,
    text: 'Loading',
    icon: IconPlus,
    loading: true,
  },
}

export const Disabled: Story = {
  args: {
    count: 0,
    text: 'Disabled',
    icon: IconPlus,
    disabled: true,
  },
}
