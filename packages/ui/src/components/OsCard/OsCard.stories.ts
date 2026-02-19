import OsCard from './OsCard.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsCard> = {
  title: 'Components/OsCard',
  component: OsCard,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OsCard>

export const Playground: Story = {
  render: () => ({
    components: { OsCard },
    template: `
      <OsCard>
        <p>This is a simple card with default styling.</p>
      </OsCard>
    `,
  }),
}

export const SimpleWrapper: Story = {
  render: () => ({
    components: { OsCard },
    template: `
      <div data-testid="simple-wrapper" class="flex flex-col gap-4" style="max-width: 400px">
        <OsCard>
          <h3 style="margin: 0 0 8px; font-weight: 600">Card Title</h3>
          <p style="margin: 0; color: #666">Some card content goes here. Cards provide a contained surface for related information.</p>
        </OsCard>
        <OsCard>
          <p style="margin: 0">A minimal card with just text.</p>
        </OsCard>
        <OsCard>
          <h3 style="margin: 0 0 8px; font-weight: 600">Another Card</h3>
          <p style="margin: 0; color: #666">Cards stack naturally in a flex column layout.</p>
        </OsCard>
      </div>
    `,
  }),
}

export const CustomClass: Story = {
  render: () => ({
    components: { OsCard },
    template: `
      <div data-testid="custom-class" style="max-width: 400px">
        <OsCard class="text-center">
          <p style="margin: 0">Centered content via custom class.</p>
        </OsCard>
      </div>
    `,
  }),
}
