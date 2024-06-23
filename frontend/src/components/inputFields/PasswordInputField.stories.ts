import { SBComp } from '#types/SBComp'

import PasswordInputField from './PasswordInputField.vue'

import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  title: 'InputFields/Password',
  component: PasswordInputField as SBComp,
  tags: ['autodocs'],
  argTypes: {},
  args: {},
} satisfies Meta<typeof PasswordInputField>

export default meta
type Story = StoryObj<typeof meta>

export const Example: Story = {
  args: {
    label: 'Password',
    placeholder: 'Type your password',
  },
}
