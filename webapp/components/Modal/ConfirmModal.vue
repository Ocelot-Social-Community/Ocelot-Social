<template>
  <ds-modal :title="title" :is-open="isOpen" @cancel="cancel" data-test="confirm-modal">
    <transition name="ds-transition-fade">
      <ds-flex v-if="success" class="hc-modal-success" centered>
        <sweetalert-icon icon="success" />
      </ds-flex>
    </transition>

    <!-- eslint-disable-next-line vue/no-v-html -->
    <p v-html="message" />

    <template #footer>
      <os-button
        class="cancel"
        :variant="!modalData.buttons.confirm.danger ? 'danger' : 'primary'"
        appearance="outline"
        @click="cancel"
        data-test="cancel-button"
      >
        <template v-if="modalData.buttons.cancel.icon" #icon>
          <base-icon :name="modalData.buttons.cancel.icon" />
        </template>
        {{ $t(modalData.buttons.cancel.textIdent) }}
      </os-button>

      <os-button
        class="confirm"
        :variant="modalData.buttons.confirm.danger ? 'danger' : 'primary'"
        appearance="filled"
        :loading="loading"
        @click="confirm"
        data-test="confirm-button"
      >
        <template v-if="modalData.buttons.confirm.icon" #icon>
          <base-icon :name="modalData.buttons.confirm.icon" />
        </template>
        {{ $t(modalData.buttons.confirm.textIdent) }}
      </os-button>
    </template>
  </ds-modal>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import { SweetalertIcon } from 'vue-sweetalert-icons'

export default {
  name: 'ConfirmModal',
  components: {
    OsButton,
    SweetalertIcon,
  },
  emits: ['close'],
  props: {
    name: { type: String, default: '' }, // only used for compatibility with the other modals in 'Modal.vue'
    type: { type: String, required: true }, // only used for compatibility with the other modals in 'Modal.vue'
    modalData: { type: Object, required: true },
    id: { type: String, required: true }, // only used for compatibility with the other modals in 'Modal.vue'
  },
  data() {
    return {
      isOpen: true,
      success: false,
      loading: false,
    }
  },
  computed: {
    title() {
      return this.$t(this.modalData.titleIdent)
    },
    message() {
      return this.$t(this.modalData.messageIdent, this.modalData.messageParams)
    },
  },
  methods: {
    async cancel() {
      await this.modalData.buttons.cancel.callback()
      this.isOpen = false
      setTimeout(() => {
        this.$emit('close')
      }, 1000)
    },
    async confirm() {
      this.loading = true
      try {
        await this.modalData.buttons.confirm.callback()
        this.success = true
        setTimeout(() => {
          this.isOpen = false
          setTimeout(() => {
            this.success = false
            this.$emit('close')
          }, 500)
        }, 1500)
      } catch (err) {
        this.isOpen = false
        this.$emit('close')
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style lang="scss">
.hc-modal-success {
  pointer-events: none;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: #fff;
  opacity: 1;
  z-index: $z-index-modal;
  border-radius: $border-radius-x-large;
}
</style>
