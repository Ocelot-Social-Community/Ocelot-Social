import { ocelotIcons } from '#src/ocelot/icons'

import OsLabeledButton from './OsLabeledButton.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const iconMap = ocelotIcons
const iconNames = Object.keys(iconMap)

const meta: Meta<typeof OsLabeledButton> = {
  title: 'Ocelot/LabeledButton',
  component: OsLabeledButton,
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'select',
      options: iconNames,
      mapping: iconMap,
    },
  },
}

export default meta
type Story = StoryObj<typeof OsLabeledButton>

export const Playground: Story = {
  args: {
    icon: iconMap.plus,
    label: 'Add item',
    filled: false,
  },
}

export const Filled: Story = {
  args: {
    icon: iconMap.check,
    label: 'Selected',
    filled: true,
  },
}

export const MultipleButtons: Story = {
  render: () => ({
    components: { OsLabeledButton },
    setup() {
      return { icons: ocelotIcons }
    },
    template: `
      <div style="display: flex; gap: 24px;">
        <OsLabeledButton :icon="icons.book" label="Articles" />
        <OsLabeledButton :icon="icons.calendar" label="Events" :filled="true" />
        <OsLabeledButton :icon="icons.users" label="Groups" />
      </div>
    `,
  }),
}
