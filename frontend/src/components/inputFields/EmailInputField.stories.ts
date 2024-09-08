import { SBComp } from '#types/SBComp'

import EmailInputField from './EmailInputField.vue'

import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  title: 'InputFields/Mail',
  component: EmailInputField as SBComp,
  tags: ['autodocs'],
  argTypes: {},
  args: {},
} satisfies Meta<typeof EmailInputField>

export default meta
type Story = StoryObj<typeof meta>

export const Example: Story = {
  args: {
    label: 'Email',
    placeholder: 'Your email address',
  },
}
