import { VIcon } from 'vuetify/components'

import { iconNames } from '#assets/icons'
import { SBComp } from '#types/SBComp'

import type { Meta, StoryObj } from '@storybook/vue3'

// More on how to set up stories at: https://storybook.js.org/docs/vue/writing-stories/introduction
const meta = {
  title: 'Icons/Ocelot Icon Set',
  component: VIcon as SBComp,
  // This component will have an automatically generated docsPage entry: https://storybook.js.org/docs/vue/writing-docs/autodocs
  tags: ['autodocs'],
  argTypes: {
    icon: { control: 'select', options: iconNames },
    size: { control: 'select', options: ['x-small', 'small', 'default', 'large', 'x-large'] },
    color: {
      control: {
        type: 'color',
        presetColors: ['#000000', '#ff0000', '#00ff00', '#0000ff'],
      },
    },
  },
  args: { size: 'default', icon: '$heart', color: '' }, // default value
} satisfies Meta<typeof VIcon>

export default meta
type Story = StoryObj<typeof meta>
/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/vue/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  args: {},
}
