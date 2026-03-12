import { computed, ref } from 'vue'

import OsButton from '#src/components/OsButton/OsButton.vue'

import OsModal from './OsModal.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsModal> = {
  title: 'Components/OsModal',
  component: OsModal,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OsModal>

interface PlaygroundArgs {
  open: boolean
  title: string
  cancelLabel: string
  confirmLabel: string
  content: string
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
    cancelLabel: { control: 'text' },
    confirmLabel: { control: 'text' },
    content: { control: 'text' },
  },
  args: {
    open: true,
    title: 'Modal Title',
    cancelLabel: 'Cancel',
    confirmLabel: 'Confirm',
    content: 'This is the modal body content.',
  },
  render: (args) => ({
    components: { OsModal },
    setup() {
      const modalProps = computed(() => ({
        open: args.open,
        title: args.title,
        cancelLabel: args.cancelLabel,
        confirmLabel: args.confirmLabel,
      }))
      const content = computed(() => args.content)
      return { modalProps, content }
    },
    template: `<OsModal v-bind="modalProps">{{ content }}</OsModal>`,
  }),
}

export const DefaultSize: Story = {
  render: () => ({
    components: { OsModal },
    template: `
      <div data-testid="default-size">
        <OsModal :open="true" title="Default Size Modal">
          <p>This is a modal with default size (max-width: 500px).</p>
          <p>It contains the standard cancel and confirm buttons.</p>
        </OsModal>
      </div>
    `,
  }),
}

export const CustomFooter: Story = {
  render: () => ({
    components: { OsModal, OsButton },
    template: `
      <div data-testid="custom-footer">
        <OsModal :open="true" title="Custom Footer">
          <p>This modal has a custom footer with different buttons.</p>
          <template #footer="{ confirm, cancel }">
            <OsButton variant="danger" appearance="outline" @click="cancel">Delete</OsButton>
            <OsButton variant="primary" @click="confirm">Save Changes</OsButton>
          </template>
        </OsModal>
      </div>
    `,
  }),
}

export const ScrollableContent: Story = {
  render: () => ({
    components: { OsModal },
    template: `
      <div data-testid="scrollable-content">
        <OsModal :open="true" title="Scrollable Content">
          <div>
            <p>This modal has a lot of content that will scroll.</p>
            <p v-for="i in 20" :key="i">Paragraph {{ i }}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
          </div>
        </OsModal>
      </div>
    `,
  }),
}
