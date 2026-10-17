<script lang="ts">
  import { defineComponent, h, isVue2 } from 'vue-demi'

  import OsButton from '#src/components/OsButton/OsButton.vue'
  import OsIcon from '#src/components/OsIcon/OsIcon.vue'
  import OsModal from '#src/components/OsModal/OsModal.vue'

  import type { ConfirmDialogVariant } from './types'
  import type { Component, PropType } from 'vue-demi'

  /**
   * Confirmation dialog built on OsModal: a question, a cancel and a confirm button.
   *
   * The dialog only reports the decision — it runs no callbacks and never closes itself on
   * confirm. The parent performs the action, drives `loading` meanwhile and closes the dialog
   * by setting `open` to false. Cancelling (button, close button, Escape, backdrop) emits
   * `cancel` and `update:open` with `false`; while `loading`, cancelling is not possible.
   *
   * Initial focus lands on the safe choice: the cancel button for `variant="danger"`, the
   * confirm button otherwise. Button colors follow the Ocelot convention: the cancel button is
   * red unless the confirm action is the destructive one, then it is the neutral primary.
   *
   * All texts are props; the English defaults are only a fallback. Translate in the app.
   *
   * Vue 2: `<os-confirm-dialog :open.sync="show" @confirm="remove" />`
   * Vue 3: `<os-confirm-dialog v-model:open="show" @confirm="remove" />`
   *
   * @slot default - Rich message content, replaces the plain-text `message`
   */
  export default defineComponent({
    name: 'OsConfirmDialog',
    props: {
      /** Whether the dialog is open */
      open: {
        type: Boolean,
        default: false,
      },
      /** Dialog title (also its accessible name) */
      title: {
        type: String,
        default: null,
      },
      /** Plain-text message; use the default slot for rich content */
      message: {
        type: String,
        default: null,
      },
      /** Label of the confirm button */
      confirmLabel: {
        type: String,
        default: 'Confirm',
      },
      /** Label of the cancel button */
      cancelLabel: {
        type: String,
        default: 'Cancel',
      },
      /** Accessible label of the close button in the header */
      closeLabel: {
        type: String,
        default: 'Close',
      },
      /** `danger` marks the confirm action as destructive */
      variant: {
        type: String as PropType<ConfirmDialogVariant>,
        default: 'default',
      },
      /** Shows a spinner on the confirm button and blocks both actions */
      loading: {
        type: Boolean,
        default: false,
      },
      /** Icon of the confirm button (same as OsIcon's `icon`) */
      confirmIcon: {
        type: [Object, Function] as PropType<Component>,
        default: undefined,
      },
      /** Icon of the cancel button (same as OsIcon's `icon`) */
      cancelIcon: {
        type: [Object, Function] as PropType<Component>,
        default: undefined,
      },
    },
    emits: ['confirm', 'cancel', 'update:open'],
    setup(props, { slots, emit }) {
      function cancel() {
        if (props.loading) {
          return
        }
        emit('cancel')
        emit('update:open', false)
      }

      // No loading guard needed: OsButton disables itself while loading
      function confirm() {
        emit('confirm')
      }

      interface ButtonSpec {
        /** data-testid of the rendered button */
        testid: string
        /** OsButton variant */
        variant: 'primary' | 'danger'
        /** OsButton appearance */
        appearance: 'outline' | 'filled'
        /** Whether OsModal moves focus here on open */
        autofocus: boolean
        /** Optional icon component / render function */
        icon: Component | undefined
        /** Visible label */
        label: string
        /** Click handler */
        onClick: () => void
        /** Disables the button */
        disabled?: boolean
        /** Shows the spinner (and disables) */
        loading?: boolean
      }

      function button(spec: ButtonSpec) {
        const attrs: Record<string, unknown> = { 'data-testid': spec.testid }
        if (spec.autofocus) {
          attrs['data-autofocus'] = ''
        }

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          const children: (string | ReturnType<typeof h>)[] = [spec.label]
          if (spec.icon) {
            children.unshift(
              h('template', { slot: 'icon' }, [h(OsIcon, { props: { icon: spec.icon } })]),
            )
          }
          return h(
            OsButton,
            {
              props: {
                variant: spec.variant,
                appearance: spec.appearance,
                disabled: spec.disabled,
                loading: spec.loading,
              },
              attrs,
              on: { click: spec.onClick },
            },
            children,
          )
        }
        /* v8 ignore stop */

        const icon = spec.icon
        return h(
          OsButton,
          {
            variant: spec.variant,
            appearance: spec.appearance,
            disabled: spec.disabled,
            loading: spec.loading,
            ...attrs,
            onClick: spec.onClick,
          },
          {
            ...(icon ? { icon: () => [h(OsIcon, { icon })] } : {}),
            default: () => [spec.label],
          },
        )
      }

      return () => {
        const isDanger = props.variant === 'danger'

        const footer = () => [
          button({
            testid: 'os-confirm-dialog-cancel',
            variant: isDanger ? 'primary' : 'danger',
            appearance: 'outline',
            autofocus: isDanger,
            icon: props.cancelIcon,
            label: props.cancelLabel,
            disabled: props.loading,
            onClick: cancel,
          }),
          button({
            testid: 'os-confirm-dialog-confirm',
            variant: isDanger ? 'danger' : 'primary',
            appearance: 'filled',
            autofocus: !isDanger,
            icon: props.confirmIcon,
            label: props.confirmLabel,
            loading: props.loading,
            onClick: confirm,
          }),
        ]

        const body = slots.default
          ? slots.default()
          : props.message
            ? [h('p', { class: 'os-confirm-dialog__message m-0' }, props.message)]
            : []

        const modalProps = {
          open: props.open,
          title: props.title,
          closeLabel: props.closeLabel,
        }

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          return h(
            OsModal,
            {
              class: 'os-confirm-dialog',
              props: modalProps,
              on: { cancel },
              scopedSlots: { footer },
            },
            body,
          )
        }
        /* v8 ignore stop */

        return h(
          OsModal,
          {
            class: 'os-confirm-dialog',
            ...modalProps,
            onCancel: cancel,
          },
          {
            default: () => body,
            footer,
          },
        )
      }
    },
  })
</script>
