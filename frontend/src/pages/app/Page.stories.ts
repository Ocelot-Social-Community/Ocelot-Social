import { SBComp } from '#types/SBComp'

import Page from './+Page.vue'

import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  title: 'Pages/App',
  component: Page as SBComp,
  tags: ['autodocs'],
  argTypes: {},
  args: {},
} satisfies Meta<typeof Page>

export default meta
type Story = StoryObj<typeof meta>

export const AppValue: Story = {
  args: {},
}

export const AppInc: Story = {
  args: {
    page: 'inc',
  },
}

export const AppReset: Story = {
  args: {
    page: 'reset',
  },
}
