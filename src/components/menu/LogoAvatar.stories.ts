import { SBComp } from '#types/SBComp'

import LogoAvatar from './LogoAvatar.vue'

import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  title: 'Menu/LogoAvatar',
  component: LogoAvatar as SBComp,
  tags: ['autodocs'],
  argTypes: {},
  args: {},
} satisfies Meta<typeof LogoAvatar>

export default meta
type Story = StoryObj<typeof meta>

export const Example: Story = {
  args: {},
}
