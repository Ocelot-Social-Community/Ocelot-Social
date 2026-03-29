import { ocelotIcons } from '#src/ocelot/icons'

import OcelotLabeledButton from './OcelotLabeledButton.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const iconMap = ocelotIcons
const iconNames = Object.keys(iconMap)

const meta: Meta<typeof OcelotLabeledButton> = {
  title: 'Ocelot/LabeledButton',
  component: OcelotLabeledButton,
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
type Story = StoryObj<typeof OcelotLabeledButton>

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
    components: { OcelotLabeledButton },
    setup() {
      return { icons: ocelotIcons }
    },
    template: `
      <div style="display: flex; gap: 24px;">
        <OcelotLabeledButton :icon="icons.book" label="Articles" />
        <OcelotLabeledButton :icon="icons.calendar" label="Events" :filled="true" />
        <OcelotLabeledButton :icon="icons.users" label="Groups" />
      </div>
    `,
  }),
}
