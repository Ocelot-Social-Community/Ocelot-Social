<script lang="ts">
  import { computed, defineComponent, getCurrentInstance, h, isVue2, onBeforeUnmount, onMounted, ref, watch } from 'vue-demi'

  import OsButton from '#src/components/OsButton/OsButton.vue'
  import { IconClose } from '#src/components/OsIcon'
  import { cn } from '#src/utils'

  import { modalPanelVariants } from './modal.variants'

  import type { ModalSize } from './modal.variants'
  import type { PropType } from 'vue-demi'

  /**
   * Modal dialog component with backdrop, focus trap, and body scroll lock.
   *
   * Supports two modes:
   * - **Custom footer** via the `footer` scoped slot (receives `{ confirm, cancel }`)
   * - **Built-in buttons** using `cancelLabel` / `confirmLabel` props
   *
   * Vue 2: `<os-modal :open.sync="show" />`
   * Vue 3: `<os-modal v-model:open="show" />`
   *
   * @slot default - Modal body content
   * @slot footer - Custom footer (scoped: { confirm, cancel })
   */
  export default defineComponent({
    name: 'OsModal',
    inheritAttrs: false,
    props: {
      /** Whether the modal is open */
      open: {
        type: Boolean,
        default: false,
      },
      /** Modal title displayed in the header */
      title: {
        type: String,
        default: null,
      },
      /** Disable ESC, backdrop click, and close button */
      force: {
        type: Boolean,
        default: false,
      },
      /** Panel width: 'default' (500px) or 'extended' (800px) */
      size: {
        type: String as PropType<ModalSize>,
        default: 'default',
      },
      /** Label for the built-in cancel button */
      cancelLabel: {
        type: String,
        default: 'Cancel',
      },
      /** Label for the built-in confirm button */
      confirmLabel: {
        type: String,
        default: 'Confirm',
      },
    },
    emits: ['update:open', 'confirm', 'cancel', 'close', 'opened'],
    setup(props, { slots, attrs, emit }) {
      const panelClasses = computed(() =>
        modalPanelVariants({ size: props.size }),
      )

      const modalRef = ref<HTMLElement | null>(null)
      const titleId = `os-modal-title-${Math.random().toString(36).slice(2, 7)}`

      /* v8 ignore start -- Vue 2 only */
      const instance = isVue2 ? getCurrentInstance() : null
      /* v8 ignore stop */

      // --- Actions ---
      function close(type: string) {
        emit('update:open', false)
        emit('close', type)
      }

      function confirm() {
        emit('confirm')
        close('confirm')
      }

      function cancel(type = 'cancel') {
        emit('cancel')
        close(type)
      }

      // --- Body scroll lock ---
      watch(
        () => props.open,
        (show) => {
          /* v8 ignore start -- SSR guard */
          if (typeof document === 'undefined') return
          /* v8 ignore stop */
          if (show) {
            document.body.style.overflow = 'hidden'
            emit('opened')
          } else {
            document.body.style.overflow = ''
          }
        },
        { immediate: true },
      )

      // --- ESC key handler ---
      function onKeydown(e: KeyboardEvent) {
        if (props.open && !props.force && e.key === 'Escape') {
          cancel('backdrop')
        }
      }

      onMounted(() => {
        document.addEventListener('keydown', onKeydown)
      })

      onBeforeUnmount(() => {
        document.removeEventListener('keydown', onKeydown)
        /* v8 ignore start -- cleanup guard */
        if (typeof document !== 'undefined') {
          document.body.style.overflow = ''
        }
        /* v8 ignore stop */
      })

      // --- Focus trap ---
      function onFocusTrap(e: KeyboardEvent) {
        if (e.key !== 'Tab' || !modalRef.value) return

        const focusable = modalRef.value.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }

      return () => {
        if (!props.open) {
          // Render an empty wrapper so v-if consumers can still find the root element
          /* v8 ignore start -- Vue 2 branch */
          if (isVue2) {
            const proxy = instance?.proxy as any // eslint-disable-line @typescript-eslint/no-explicit-any
            const parentClass = proxy?.$vnode?.data?.staticClass || ''
            const parentDynClass = proxy?.$vnode?.data?.class
            return h('div', {
              class: ['os-modal-wrapper', parentClass, parentDynClass].filter(Boolean),
            })
          }
          /* v8 ignore stop */
          const { class: closedAttrClass } = attrs as Record<string, unknown>
          return h('div', { class: cn('os-modal-wrapper', (closedAttrClass as string) || '') })
        }

        // --- Close button ---
        const closeBtn = !props.force
          ? h(
              OsButton,
              {
                class: 'os-modal__close absolute top-3 right-3',
                appearance: 'ghost',
                size: 'sm',
                circle: true,
                'aria-label': 'Close',
                'data-testid': 'os-modal-close',
                onClick: () => cancel('close'),
              },
              { icon: () => [h(IconClose)] },
            )
          : null

        // --- Header ---
        const headerChildren: ReturnType<typeof h>[] = []
        if (props.title) {
          headerChildren.push(
            h('h2', { class: 'os-modal__title text-lg font-semibold m-0', id: titleId }, props.title),
          )
        }
        if (closeBtn) headerChildren.push(closeBtn)

        const header = h(
          'div',
          { class: 'os-modal__header relative px-6 pt-5 pb-2' },
          headerChildren,
        )

        // --- Content ---
        const content = h(
          'div',
          { class: 'os-modal__content px-6 py-2 overflow-y-auto max-h-[50vh]' },
          slots.default?.(),
        )

        // --- Footer ---
        let footerContent: ReturnType<typeof h>[] | undefined

        if (slots.footer) {
          footerContent = slots.footer({ confirm, cancel })
        } else {
          footerContent = [
            h(
              OsButton,
              {
                appearance: 'ghost',
                'data-testid': 'os-modal-cancel',
                onClick: () => cancel('cancel'),
              },
              { default: () => [props.cancelLabel] },
            ),
            h(
              OsButton,
              {
                variant: 'primary',
                'data-testid': 'os-modal-confirm',
                onClick: () => confirm(),
              },
              { default: () => [props.confirmLabel] },
            ),
          ]
        }

        const footer = h(
          'footer',
          { class: 'os-modal__footer bg-[#f5f5f5] px-6 py-3 flex justify-end gap-2 rounded-b-lg' },
          footerContent,
        )

        // --- Backdrop ---
        const backdrop = h('div', {
          class: 'os-modal__backdrop fixed inset-0 bg-black/70 z-[9998]',
          'data-testid': 'os-modal-backdrop',
          onClick: () => {
            if (!props.force) cancel('backdrop')
          },
        })

        // --- Panel ---
        const panelProps: Record<string, unknown> = {
          class: panelClasses.value,
          role: 'dialog',
          'aria-modal': 'true',
          'data-testid': 'os-modal-panel',
          onKeydown: onFocusTrap,
          ref: modalRef,
        }
        if (props.title) {
          panelProps['aria-labelledby'] = titleId
        }

        const panel = h('div', panelProps, [header, content, footer])

        // --- Root wrapper ---
        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const listeners = proxy?.$listeners || {}
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class

          return h(
            'div',
            {
              class: ['os-modal-wrapper', parentClass, parentDynClass].filter(Boolean),
              on: {
                ...listeners,
                keydown: onFocusTrap,
              },
            },
            [backdrop, panel],
          )
        }
        /* v8 ignore stop */

        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>
        return h(
          'div',
          {
            class: cn('os-modal-wrapper', (attrClass as string) || ''),
            ...restAttrs,
          },
          [backdrop, panel],
        )
      }
    },
  })
</script>
