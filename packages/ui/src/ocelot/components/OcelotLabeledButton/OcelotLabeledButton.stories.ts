import { IconCheck, IconClose, IconPlus } from '#src/components/OsIcon'

import OcelotLabeledButton from './OcelotLabeledButton.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OcelotLabeledButton> = {
  title: 'Ocelot/LabeledButton',
  component: OcelotLabeledButton,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OcelotLabeledButton>

export const Default: Story = {
  args: {
    icon: IconPlus,
    label: 'Add item',
    filled: false,
  },
}

export const Filled: Story = {
  args: {
    icon: IconCheck,
    label: 'Selected',
    filled: true,
  },
}

export const MultipleButtons: Story = {
  render: () => ({
    components: { OcelotLabeledButton },
    setup() {
      return { IconPlus, IconCheck, IconClose }
    },
    template: `
      <div style="display: flex; gap: 24px;">
        <OcelotLabeledButton :icon="IconPlus" label="Articles" />
        <OcelotLabeledButton :icon="IconCheck" label="Events" :filled="true" />
        <OcelotLabeledButton :icon="IconClose" label="Groups" />
      </div>
    `,
  }),
}
