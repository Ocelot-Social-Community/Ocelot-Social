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
  open: boolean
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
    open: { control: 'boolean' },
    title: { control: 'text' },
    message: { control: 'text' },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    closeLabel: { control: 'text' },
    variant: { control: 'select', options: ['default', 'danger'] },
    loading: { control: 'boolean' },
  },
  args: {
    open: true,
    title: 'Delete post',
    message: 'Do you really want to delete this post?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    closeLabel: 'Close',
    variant: 'danger',
    loading: false,
  },
  render: (args) => ({
    components: { OsConfirmDialog },
    setup() {
      const dialogProps = computed(() => ({ ...args }))
      return { dialogProps }
    },
    template: `<OsConfirmDialog v-bind="dialogProps" />`,
  }),
}

export const Default: Story = {
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
