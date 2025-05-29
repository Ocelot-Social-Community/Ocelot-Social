import { SBComp } from '#types/SBComp'

import TopMenu from './TopMenu.vue'

import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  title: 'Menu/TopMenu',
  component: TopMenu as SBComp,
  tags: ['autodocs'],
  argTypes: {},
  args: {},
} satisfies Meta<typeof TopMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Example: Story = {
  args: {},
}
