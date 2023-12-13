import { within, userEvent } from '@storybook/testing-library'

import ExamplePage from './ExamplePage.vue'

import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  title: 'Example/Page',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  component: ExamplePage,
  render: () => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    components: { ExamplePage },
    template: '<example-page />',
  }),
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/vue/configure/story-layout
    layout: 'fullscreen',
  },
  // This component will have an automatically generated docsPage entry: https://storybook.js.org/docs/vue/writing-docs/autodocs
  tags: ['autodocs'],
} satisfies Meta<typeof ExamplePage>

export default meta
type Story = StoryObj<typeof meta>

// More on interaction testing: https://storybook.js.org/docs/vue/writing-tests/interaction-testing
export const LoggedIn: Story = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  play: async ({ canvasElement }: any) => {
    const canvas = within(canvasElement as HTMLElement)
    const loginButton = canvas.getByRole('button', {
      name: /Log in/i,
    })
    await userEvent.click(loginButton)
  },
}

export const LoggedOut: Story = {}
