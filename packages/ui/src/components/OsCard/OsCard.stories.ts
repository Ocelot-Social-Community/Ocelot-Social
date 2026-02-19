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

export const Highlight: Story = {
  render: () => ({
    components: { OsCard },
    template: `
      <div data-testid="highlight" class="flex flex-col gap-4" style="max-width: 400px">
        <OsCard :highlight="true">
          <h3 style="margin: 0 0 8px; font-weight: 600">Pinned Post</h3>
          <p style="margin: 0; color: #666">This card is highlighted with a colored border, used for pinned or featured content.</p>
        </OsCard>
        <OsCard>
          <h3 style="margin: 0 0 8px; font-weight: 600">Normal Post</h3>
          <p style="margin: 0; color: #666">This card has no highlight for comparison.</p>
        </OsCard>
      </div>
    `,
  }),
}

export const HeroImage: Story = {
  render: () => ({
    components: { OsCard },
    template: `
      <div data-testid="hero-image" class="flex flex-col gap-4" style="max-width: 400px">
        <OsCard>
          <template #heroImage>
            <img
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%234a5a9e' width='400' height='200'/%3E%3Ctext x='200' y='105' text-anchor='middle' fill='white' font-size='20' font-family='sans-serif'%3EHero Image%3C/text%3E%3C/svg%3E"
              alt="Hero placeholder"
              style="display: block; width: 100%; height: auto"
            />
          </template>
          <h3 style="margin: 0 0 8px; font-weight: 600">Post with Hero Image</h3>
          <p style="margin: 0; color: #666">The image spans the full card width. Content below has its own padding.</p>
        </OsCard>
        <OsCard>
          <h3 style="margin: 0 0 8px; font-weight: 600">Card without Image</h3>
          <p style="margin: 0; color: #666">A regular card for comparison.</p>
        </OsCard>
      </div>
    `,
  }),
}
