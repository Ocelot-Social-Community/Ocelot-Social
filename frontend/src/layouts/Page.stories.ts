import { SBComp } from '#types/SBComp'

import Layout from './DefaultLayout.vue'

import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  title: 'Layouts/Default',
  component: Layout as SBComp,
  tags: ['autodocs'],
  argTypes: {},
  args: {},
} satisfies Meta<typeof Layout>

export default meta
type Story = StoryObj<typeof meta>

export const Example: Story = {
  args: {},
}
