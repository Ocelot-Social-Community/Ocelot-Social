import OsRibbon from './OsRibbon.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsRibbon> = {
  title: 'Ocelot/Ribbon',
  component: OsRibbon,
  tags: ['autodocs'],
  decorators: [
    (): { template: string } => ({
      template:
        '<div style="position: relative; height: 60px"><story style="position: absolute; top: 0; right: 24px" /></div>',
    }),
  ],
}

export default meta
type Story = StoryObj<typeof OsRibbon>

export const Article: Story = {
  args: {
    text: 'Article',
    type: 'Article',
  },
}

export const Event: Story = {
  args: {
    text: 'Event',
    type: 'Event',
  },
}

export const Pinned: Story = {
  args: {
    text: 'Article',
    type: 'Article',
    pinned: true,
  },
}
