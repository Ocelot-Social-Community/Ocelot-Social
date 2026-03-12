import { computed, ref } from 'vue'

import OsButton from '#src/components/OsButton/OsButton.vue'

import OsModal from './OsModal.vue'

import type { ModalSize } from './modal.variants'
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
  force: boolean
  size: ModalSize
  cancelLabel: string
  confirmLabel: string
  content: string
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
    force: { control: 'boolean' },
    size: { control: 'select', options: ['default', 'extended'] },
    cancelLabel: { control: 'text' },
    confirmLabel: { control: 'text' },
    content: { control: 'text' },
  },
  args: {
    open: true,
    title: 'Modal Title',
    force: false,
    size: 'default',
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
        force: args.force,
        size: args.size,
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

export const ExtendedSize: Story = {
  render: () => ({
    components: { OsModal },
    template: `
      <div data-testid="extended-size">
        <OsModal :open="true" title="Extended Size Modal" size="extended">
          <p>This is a modal with extended size (max-width: 800px).</p>
          <p>It is wider and suitable for more complex content.</p>
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

export const BuiltInButtons: Story = {
  render: () => ({
    components: { OsModal },
    template: `
      <div data-testid="built-in-buttons">
        <OsModal
          :open="true"
          title="Built-in Buttons"
          cancel-label="Abbrechen"
          confirm-label="Bestätigen"
        >
          <p>This modal uses the built-in cancel and confirm buttons with custom labels.</p>
        </OsModal>
      </div>
    `,
  }),
}

export const ForceMode: Story = {
  render: () => ({
    components: { OsModal },
    template: `
      <div data-testid="force-mode">
        <OsModal
          :open="true"
          title="Force Mode"
          :force="true"
          confirm-label="I Understand"
          cancel-label="Go Back"
        >
          <p>This modal cannot be closed via ESC, backdrop click, or the close button.</p>
          <p>The user must use the footer buttons to proceed.</p>
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
