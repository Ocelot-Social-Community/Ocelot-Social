<template>
  <div>
    <div
      :key="key"
      class="ds-modal-wrapper">
      <transition
        name="ds-transition-fade"
        appear>
        <div
          v-if="isOpen"
          ref="backdrop"
          class="ds-modal-backdrop"
          @click="backdropHandler"
        >
          &nbsp;
        </div>
      </transition>
      <transition
        name="ds-transition-modal-appear"
        appear>
        <ds-card
          v-if="isOpen"
          ref="modal"
          class="ds-modal"
          :class="[extended && 'ds-modal-extended']"
          :header="title"
          tableindex="-1"
          role="dialog"
          style="display: block"
        >
          <ds-button
            v-if="!force"
            class="ds-modal-close"
            ghost
            size="small"
            icon="close"
            aria-hidden="true"
            @click="cancel('close')"
          />
          <!-- @slot Modal content -->
          <slot ref="modalBody"/>
          <template #footer>
            <!-- @slot Modal footer with action buttons -->
            <slot
              name="footer"
              :confirm="confirm"
              :cancel="cancel"
              :cancel-label="cancelLabel"
              :confirm-label="confirmLabel"
            >
              <ds-button
                ghost
                icon="close"
                @click.prevent="cancel('cancel')">{{ cancelLabel }}</ds-button>
              <ds-button
                primary
                icon="check"
                @click.prevent="confirm('confirm')">{{ confirmLabel }}</ds-button>
            </slot>
          </template>
        </ds-card>
      </transition>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

/* eslint-disable no-empty */

/**
 * Simple Modal Component
 * @version 1.0.0
 */
export default defineComponent({
  name: 'DsModal',

  model: {
    prop: 'isOpen',
    event: 'update:isOpen'
  },

  props: {
    /**
     * Modal title
     */
    title: {
      type: String,
      default: null
    },
    /**
     * Open state
     */
    isOpen: {
      type: Boolean,
      default: false
    },
    /**
     * Force user input by disabeling the ESC key, close button and click on the backdrop
     */
    force: {
      type: Boolean,
      default: false
    },
    /**
     * Allow closing without choosing action by ESC key, close button or click on the backdrop
     */
    extended: {
      type: Boolean,
      default: false
    },
    /**
     * Cancel button label
     */
    cancelLabel: {
      type: String,
      default: 'Cancel'
    },
    /**
     * Confirm button label
     */
    confirmLabel: {
      type: String,
      default: 'Confirm'
    }
  },
  emits: ['opened', 'confirm', 'cancel', 'update:isOpen', 'close'],

  watch: {
    isOpen: {
      immediate: true,
      handler(show) {
        try {
          if (show) {
            this.$emit('opened')
            document.getElementsByTagName('body')[0].classList.add('modal-open')
          } else {
            document
              .getElementsByTagName('body')[0]
              .classList.remove('modal-open')
          }
        } catch (err) {}
      }
    }
  },

  beforeCreate() {
    // create random key string
    this.key = Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, '')
      .substr(0, 5)
  },

  mounted() {
    const keydownListener = document.addEventListener('keydown', e => {
      if (this.isOpen && !this.force && e.keyCode === 27) {
        this.cancel('backdrop')
      }
    })
    this.$once('hook:beforeDestroy', () => {
      document.removeEventListener('keydown', keydownListener)
    })

    if (this.isOpen) {
      this.$emit('opened')
    }
  },

  methods: {
    confirm(type = 'confirm') {
      this.$emit('confirm')
      this.close(type)
    },
    cancel(type = 'cancel') {
      this.$emit('cancel')
      this.close(type)
    },
    close(type) {
      this.$emit('update:isOpen', false)
      this.$emit('close', type)
    },
    backdropHandler() {
      if (!this.force) {
        this.cancel('backdrop')
      }
    }
  },
});
</script>

<style lang="scss" src="./style.scss">
</style>

