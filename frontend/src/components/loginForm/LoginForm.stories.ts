import { SBComp } from '#types/SBComp'

import LoginForm from './LoginForm.vue'

import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  title: 'Pages/Login/LoginForm',
  component: LoginForm as SBComp,
  tags: ['autodocs'],
  argTypes: {},
  args: {},
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const Example: Story = {
  args: {},
}
