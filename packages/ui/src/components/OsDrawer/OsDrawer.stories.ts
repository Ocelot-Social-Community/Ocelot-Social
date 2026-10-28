import { ref } from 'vue'

import OsButton from '#src/components/OsButton/OsButton.vue'

import OsDrawer from './OsDrawer.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsDrawer> = {
  title: 'Components/OsDrawer',
  component: OsDrawer,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OsDrawer>

interface PlaygroundArgs {
  side: 'left' | 'right'
  ariaLabel: string
  closeLabel: string
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    side: { control: 'select', options: ['left', 'right'] },
    ariaLabel: { control: 'text' },
    closeLabel: { control: 'text' },
  },
  args: {
    side: 'right',
    ariaLabel: 'Sidebar',
    closeLabel: 'Close',
  },
  render: (args) => ({
    components: { OsDrawer, OsButton },
    setup() {
      const open = ref(false)
      return { args, open }
    },
    template: `
      <div>
        <OsButton variant="primary" @click="open = true">Open drawer</OsButton>
        <OsDrawer v-model:open="open" v-bind="args">
          <h2>Sidebar</h2>
          <p>Content that belongs next to the page.</p>
        </OsDrawer>
      </div>
    `,
  }),
}

const content = `
  <h2 style="margin-top: 0">Running video calls</h2>
  <p>Content that belongs next to the page rather than in front of it.</p>
  <a href="#">A link inside</a>
`

export const Right: Story = {
  render: () => ({
    components: { OsDrawer },
    template: `
      <div data-testid="right">
        <OsDrawer :open="true" side="right" aria-label="Sidebar">${content}</OsDrawer>
      </div>
    `,
  }),
}

export const Left: Story = {
  render: () => ({
    components: { OsDrawer },
    template: `
      <div data-testid="left">
        <OsDrawer :open="true" side="left" aria-label="Sidebar">${content}</OsDrawer>
      </div>
    `,
  }),
}
