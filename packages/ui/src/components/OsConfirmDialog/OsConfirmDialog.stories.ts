import { computed, ref } from 'vue'

import OsButton from '#src/components/OsButton/OsButton.vue'
import { IconCheck, IconClose } from '#src/components/OsIcon'

import OsConfirmDialog from './OsConfirmDialog.vue'

import type { ConfirmDialogVariant } from './types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsConfirmDialog> = {
  title: 'Components/OsConfirmDialog',
  component: OsConfirmDialog,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OsConfirmDialog>

interface PlaygroundArgs {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  closeLabel: string
  variant: ConfirmDialogVariant
  loading: boolean
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    title: { control: 'text' },
    message: { control: 'text' },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    closeLabel: { control: 'text' },
    variant: { control: 'select', options: ['default', 'danger'] },
    loading: { control: 'boolean' },
  },
  args: {
    title: 'Delete post',
    message: 'Do you really want to delete this post?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    closeLabel: 'Close',
    variant: 'danger',
    loading: false,
  },
  // Opened from a button and bound with v-model, like it is used: cancel, the close button,
  // Escape and the backdrop close it, and it starts closed so the docs page stays usable. Confirm
  // only reports the decision — closing is the parent's job, so here it closes right away.
  render: (args) => ({
    components: { OsConfirmDialog, OsButton },
    setup() {
      const open = ref(false)
      const dialogProps = computed(() => ({ ...args }))
      return { open, dialogProps }
    },
    template: `
      <div>
        <OsButton variant="primary" @click="open = true">Open dialog</OsButton>
        <OsConfirmDialog v-bind="dialogProps" v-model:open="open" @confirm="open = false" />
      </div>
    `,
  }),
}

// An open dialog covers the page it is rendered on. On the autodocs page the stories render
// inline by default, and an open dialog would lay its backdrop, focus trap and scroll lock over
// the docs themselves — and, with nobody listening to update:open, stay there. So the open
// stories get an iframe of their own there, high enough for the dialog they show (as OsModal's).
const ownFrame = (iframeHeight: number) => ({ docs: { story: { inline: false, iframeHeight } } })

export const Default: Story = {
  parameters: ownFrame(320),
  render: () => ({
    components: { OsConfirmDialog },
    template: `
      <div data-testid="default">
        <OsConfirmDialog
          :open="true"
          variant="default"
          title="Join group"
          message="Do you want to join this group?"
          confirm-label="Join"
          cancel-label="Cancel"
        />
      </div>
    `,
  }),
}

export const Danger: Story = {
  parameters: ownFrame(320),
  render: () => ({
    components: { OsConfirmDialog },
    template: `
      <div data-testid="danger">
        <OsConfirmDialog
          :open="true"
          variant="danger"
          title="Delete post"
          message="Do you really want to delete this post? This cannot be undone."
          confirm-label="Delete"
          cancel-label="Cancel"
        />
      </div>
    `,
  }),
}

export const WithIcons: Story = {
  parameters: ownFrame(320),
  render: () => ({
    components: { OsConfirmDialog },
    setup() {
      return { IconCheck, IconClose }
    },
    template: `
      <div data-testid="with-icons">
        <OsConfirmDialog
          :open="true"
          variant="danger"
          title="Revoke API key"
          message="Apps using this key stop working immediately."
          confirm-label="Revoke"
          cancel-label="Cancel"
          :confirm-icon="IconCheck"
          :cancel-icon="IconClose"
        />
      </div>
    `,
  }),
}

export const Loading: Story = {
  parameters: ownFrame(320),
  render: () => ({
    components: { OsConfirmDialog },
    template: `
      <div data-testid="loading">
        <OsConfirmDialog
          :open="true"
          variant="danger"
          :loading="true"
          title="Delete post"
          message="Deleting…"
          confirm-label="Delete"
          cancel-label="Cancel"
        />
      </div>
    `,
  }),
}

export const RichMessage: Story = {
  parameters: ownFrame(360),
  render: () => ({
    components: { OsConfirmDialog },
    template: `
      <div data-testid="rich-message">
        <OsConfirmDialog
          :open="true"
          variant="danger"
          title="Leave group"
          confirm-label="Leave"
          cancel-label="Stay"
        >
          <p class="m-0">Leaving a group may be irreversible!</p>
          <p class="mb-0">Really leave the group <strong>“Gardening”</strong>?</p>
        </OsConfirmDialog>
      </div>
    `,
  }),
}

export const WithTrigger: Story = {
  render: () => ({
    components: { OsConfirmDialog, OsButton },
    setup() {
      const open = ref(false)
      const loading = ref(false)
      const result = ref('none')
      // The parent runs the action and closes the dialog — the dialog only reports the decision
      function onConfirm() {
        loading.value = true
        setTimeout(() => {
          loading.value = false
          open.value = false
          result.value = 'confirmed'
        }, 300)
      }
      function onCancel() {
        result.value = 'cancelled'
      }
      return { open, loading, result, onConfirm, onCancel }
    },
    template: `
      <div data-testid="with-trigger">
        <OsButton data-testid="open-dialog" @click="open = true">Archive post</OsButton>
        <p data-testid="result">Result: {{ result }}</p>
        <OsConfirmDialog
          v-model:open="open"
          :loading="loading"
          title="Archive post"
          message="Archived posts are hidden from the timeline."
          confirm-label="Archive"
          cancel-label="Cancel"
          @confirm="onConfirm"
          @cancel="onCancel"
        />
      </div>
    `,
  }),
}
