import { SBComp } from '#types/SBComp'

import Page from './+Page.vue'

import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  title: 'Pages/About',
  component: Page as SBComp,
  tags: ['autodocs'],
  argTypes: {},
  args: {},
} satisfies Meta<typeof Page>

export default meta
type Story = StoryObj<typeof meta>

export const Example: Story = {
  args: {},
}
