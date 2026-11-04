<template>
  <os-confirm-dialog
    :open="isOpen"
    :title="title"
    :confirm-label="$t(modalData.buttons.confirm.textIdent)"
    :cancel-label="$t(modalData.buttons.cancel.textIdent)"
    :close-label="$t('actions.close')"
    :variant="modalData.buttons.confirm.danger ? 'danger' : 'default'"
    :confirm-icon="modalData.buttons.confirm.icon"
    :cancel-icon="modalData.buttons.cancel.icon"
    :loading="loading"
    data-test="confirm-modal"
    @confirm="confirm"
    @cancel="cancel"
  >
    <!-- The translations carry markup (<b>, <br>); every interpolated value is escaped. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p v-html="message" />
  </os-confirm-dialog>
</template>

<script>
import { escape, mapValues } from 'lodash'
import { OsConfirmDialog } from '@ocelot-social/ui'

/**
 * Translating adapter around the i18n-agnostic OsConfirmDialog: resolves the `modalData`
 * idents with $t and runs the (possibly async) button callbacks, showing the confirm button
 * as loading meanwhile. The callbacks report success or failure themselves (toasts).
 */
export default {
  name: 'ConfirmModal',
  components: {
    OsConfirmDialog,
  },
  emits: ['close'],
  props: {
    modalData: { type: Object, required: true },
  },
  data() {
    return {
      isOpen: true,
      loading: false,
    }
  },
  computed: {
    title() {
      return this.$t(this.modalData.titleIdent)
    },
    message() {
      // Params are user content (names, titles) and land in v-html: escape them, so only the
      // translation's own markup is interpreted.
      const { messageIdent, messageParams } = this.modalData
      const params =
        messageParams &&
        mapValues(messageParams, (value) => (typeof value === 'string' ? escape(value) : value))
      return this.$t(messageIdent, params)
    },
  },
  methods: {
    close() {
      this.isOpen = false
      this.$emit('close')
    },
    async cancel() {
      await this.modalData.buttons.cancel.callback()
      this.close()
    },
    async confirm() {
      this.loading = true
      try {
        await this.modalData.buttons.confirm.callback()
      } catch {
        // The callbacks show their own error toasts; the dialog just closes.
      } finally {
        this.loading = false
        this.close()
      }
    },
  },
}
</script>
