import { ref } from 'vue'

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
  title: string
  cancelLabel: string
  confirmLabel: string
  content: string
}

export const Playground: StoryObj<PlaygroundArgs> = {
  // `open` belongs to the button below, not to a control that could not follow it.
  parameters: { controls: { exclude: ['open'] } },
  argTypes: {
    title: { control: 'text' },
    cancelLabel: { control: 'text' },
    confirmLabel: { control: 'text' },
    content: { control: 'text' },
  },
  args: {
    title: 'Modal Title',
    cancelLabel: 'Cancel',
    confirmLabel: 'Confirm',
    content: 'This is the modal body content.',
  },
  // Opened from a button and bound with v-model, like it is used: Escape, the backdrop and both
  // buttons close it, and it starts closed so the docs page it is rendered on stays usable.
  render: (args) => ({
    components: { OsModal, OsButton },
    setup() {
      const open = ref(false)
      return { args, open }
    },
    template: `
      <div>
        <OsButton variant="primary" @click="open = true">Open modal</OsButton>
        <OsModal
          v-model:open="open"
          :title="args.title"
          :cancel-label="args.cancelLabel"
          :confirm-label="args.confirmLabel"
        >{{ args.content }}</OsModal>
      </div>
    `,
  }),
}

// An open modal covers the page it is rendered on. On the autodocs page the stories render
// inline by default, and an open modal would lay its backdrop, focus trap and scroll lock over
// the docs themselves — and, with nobody listening to update:open, stay there. So the open
// stories get an iframe of their own there, high enough for the modal they show.
const ownFrame = (iframeHeight: number) => ({ docs: { story: { inline: false, iframeHeight } } })

export const DefaultSize: Story = {
  parameters: ownFrame(360),
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
  parameters: ownFrame(320),
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
  // The content area is capped at half the viewport, so this frame shows it scrolling.
  parameters: ownFrame(520),
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
