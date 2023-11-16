import ExampleHeader from './ExampleHeader.vue'

import type { Meta, StoryObj } from '@storybook/vue3'

const meta = {
  /* 👇 The title prop is optional.
   * See https://storybook.js.org/docs/vue/configure/overview#configure-story-loading
   * to learn how to generate automatic titles
   */
  title: 'Example/Header',
  component: ExampleHeader,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => ({
    components: { ExampleHeader },
    setup() {
      return { args }
    },
    template: '<example-header :user="args.user" />',
  }),
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'fullscreen',
  },
  // This component will have an automatically generated docsPage entry: https://storybook.js.org/docs/vue/writing-docs/autodocs
  tags: ['autodocs'],
} satisfies Meta<typeof ExampleHeader>

export default meta
type Story = StoryObj<typeof meta>

export const LoggedIn: Story = {
  args: {
    user: {
      name: 'Jane Doe',
    },
  },
}

export const LoggedOut: Story = {
  args: {
    user: null,
  },
}
