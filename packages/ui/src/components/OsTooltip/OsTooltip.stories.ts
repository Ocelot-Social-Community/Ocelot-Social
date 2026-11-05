import OsTooltip from './OsTooltip.vue'
import { vOsTooltip } from './vOsTooltip'

import type { TooltipPlacement } from './types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsTooltip> = {
  title: 'Components/OsTooltip',
  component: OsTooltip,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OsTooltip>

const BUTTON_STYLE =
  'padding: 6px 12px; border: 1px solid #b1abba; border-radius: 4px; background: #fff; font: inherit; cursor: pointer;'

/** Room around the element, so a shown tooltip falls inside the screenshot. */
const stage = (testId: string, body: string, style = 'padding: 64px 160px; gap: 96px;') => `
  <div data-testid="${testId}" style="display: inline-flex; ${style}">${body}</div>
`

interface PlaygroundArgs {
  content: string
  placement: TooltipPlacement
  multiline: boolean
  narrow: boolean
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    placement: {
      control: 'select',
      options: ['top', 'top-start', 'right', 'bottom', 'bottom-start', 'bottom-end', 'left'],
    },
  },
  args: {
    content: 'Hover me, or focus me with the keyboard',
    placement: 'top',
    multiline: false,
    narrow: false,
  },
  render: (args) => ({
    components: { OsTooltip },
    setup: () => ({ args, style: BUTTON_STYLE }),
    template: `
      <div style="padding: 96px;">
        <OsTooltip v-bind="args">
          <button type="button" :style="style">Hover me</button>
        </OsTooltip>
      </div>
    `,
  }),
}

/** The four sides, each tooltip shown for the picture. */
export const Placements: Story = {
  render: () => ({
    components: { OsTooltip },
    setup: () => ({
      placements: ['top', 'right', 'bottom', 'left'],
      style: BUTTON_STYLE,
    }),
    template: stage(
      'placements',
      `
        <OsTooltip v-for="placement in placements" :key="placement" :content="placement" :placement="placement" :show="true">
          <button type="button" :style="style">{{ placement }}</button>
        </OsTooltip>
      `,
      'padding: 64px 96px; gap: 96px;',
    ),
  }),
}

/** Line breaks in the text are kept, e.g. a button's label with the device behind it. */
export const Multiline: Story = {
  render: () => ({
    components: { OsTooltip },
    setup: () => ({ content: 'Microphone\nMacBook Pro Microphone', style: BUTTON_STYLE }),
    template: stage(
      'multiline',
      `
        <OsTooltip :content="content" multiline :show="true">
          <button type="button" :style="style">Mic</button>
        </OsTooltip>
      `,
      'padding: 80px 160px 32px;',
    ),
  }),
}

/** A sentence wraps into a short block. */
export const Narrow: Story = {
  render: () => ({
    components: { OsTooltip },
    setup: () => ({
      content: 'Messages here are seen by everyone in the group, also after the call.',
      style: BUTTON_STYLE,
    }),
    template: stage(
      'narrow',
      `
        <OsTooltip :content="content" narrow :show="true">
          <button type="button" :style="style">Group chat</button>
        </OsTooltip>
      `,
      'padding: 112px 160px 32px;',
    ),
  }),
}

/** Plain text unless asked otherwise: markup in the text shows as text. */
export const PlainText: Story = {
  render: () => ({
    components: { OsTooltip },
    setup: () => ({ style: BUTTON_STYLE }),
    template: stage(
      'plain-text',
      `
        <OsTooltip content="<b>Bold</b> stays text" :show="true">
          <button type="button" :style="style">Plain</button>
        </OsTooltip>
        <OsTooltip content="<b>Bold</b> as HTML" html :show="true">
          <button type="button" :style="style">HTML</button>
        </OsTooltip>
      `,
      'padding: 64px 112px; gap: 192px;',
    ),
  }),
}

/** `v-os-tooltip` on plain elements; shown on hover and on keyboard focus, hidden by Esc. */
export const Directive: Story = {
  render: () => ({
    directives: { osTooltip: vOsTooltip },
    setup: () => ({ style: BUTTON_STYLE }),
    template: stage(
      'directive',
      `
        <button type="button" :style="style" v-os-tooltip="'Delete the post'">Delete</button>
        <button type="button" :style="style" v-os-tooltip="{ content: 'Share the post', placement: 'bottom' }">Share</button>
      `,
    ),
  }),
}
