<script lang="ts">
  import {
    computed,
    defineComponent,
    getCurrentInstance,
    h,
    isVue2,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
  } from 'vue-demi'

  import OsButton from '#src/components/OsButton/OsButton.vue'
  import { IconCheck, IconClose } from '#src/components/OsIcon'
  import { cn } from '#src/utils'

  import { modalPanelVariants } from './modal.variants'

  import type { ModalSize } from './modal.variants'
  import type { PropType } from 'vue-demi'

  /** Elements a Tab press can land on (disabled controls are skipped by the browser) */
  const FOCUSABLE = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')

  /**
   * Modal dialog component with backdrop, focus trap, and body scroll lock.
   *
   * Focus moves into the dialog on open (to the element marked with `data-autofocus`,
   * otherwise to the panel itself), stays trapped inside while open, and returns to the
   * previously focused element on close.
   *
   * All user-visible strings are props; the English defaults are only a fallback, the
   * library ships no translations.
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
      /** Accessible label for the dialog when no visible title is provided */
      ariaLabel: {
        type: String,
        default: 'Dialog',
      },
      /** Accessible label of the close button in the header */
      closeLabel: {
        type: String,
        default: 'Close',
      },
      /** Maximum panel width: sm (400px), md (500px), lg (700px) */
      size: {
        type: String as PropType<ModalSize>,
        default: 'md',
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
      const panelClasses = computed(() => modalPanelVariants({ size: props.size }))

      const modalRef = ref<HTMLElement | null>(null)
      const isScrolled = ref(false)
      let previousOverflow = ''
      // Whatever had focus before opening (HTML or SVG — both can take focus back)
      let restoreFocusTo: (Element & HTMLOrSVGElement) | null = null
      const titleId = `os-modal-title-${Math.random().toString(36).slice(2, 7)}`

      /* v8 ignore start -- Vue 2 only */
      const instance = isVue2 ? getCurrentInstance() : null
      // In Vue 2, global h() needs currentInstance; use $createElement for icon render fns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createElement = isVue2 ? (instance?.proxy as any)?.$createElement : h
      /* v8 ignore stop */

      // Vue 2's h() does NOT convert onClick → on.click. Helper to build event props.
      function eventProps(
        events: Record<string, (...args: unknown[]) => void>,
      ): Record<string, unknown> {
        /* v8 ignore start -- Vue 2 branch */
        if (isVue2) {
          return { on: events }
        }
        /* v8 ignore stop */
        const result: Record<string, unknown> = {}
        for (const [name, fn] of Object.entries(events)) {
          result[`on${name.charAt(0).toUpperCase()}${name.slice(1)}`] = fn
        }
        return result
      }

      // Vue 2's h() silently drops HTML attributes passed flat; they must go under `attrs`.
      function htmlAttrs(record: Record<string, unknown>): Record<string, unknown> {
        /* v8 ignore start -- Vue 2 branch */
        if (isVue2) {
          return { attrs: record }
        }
        /* v8 ignore stop */
        return record
      }

      // --- Focus management ---
      function focusInitial() {
        void nextTick(() => {
          const panel = modalRef.value
          if (!props.open || !panel) {
            return
          }
          const target = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel
          target.focus()
        })
      }

      function restoreFocus() {
        const target = restoreFocusTo
        restoreFocusTo = null
        if (target?.isConnected) {
          target.focus()
        }
      }

      // --- Scroll tracking for top fade ---
      function onContentScroll(e: Event) {
        const target = e.target as HTMLElement
        isScrolled.value = target.scrollTop > 0
      }

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
          if (typeof document === 'undefined') {
            return
          }
          /* v8 ignore stop */
          if (show) {
            previousOverflow = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            restoreFocusTo = document.activeElement as (Element & HTMLOrSVGElement) | null
            focusInitial()
            emit('opened')
          } else {
            document.body.style.overflow = previousOverflow
            restoreFocus()
          }
        },
        { immediate: true },
      )

      // --- ESC key handler ---
      function onKeydown(e: KeyboardEvent) {
        if (props.open && e.key === 'Escape') {
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
          document.body.style.overflow = previousOverflow
        }
        /* v8 ignore stop */
        restoreFocus()
      })

      // --- Focus trap ---
      function onFocusTrap(e: KeyboardEvent) {
        if (e.key !== 'Tab') {
          return
        }

        // Bound on the panel, which always holds at least the close button
        const panel = e.currentTarget as HTMLElement
        const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE)
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement

        // Shift+Tab from the panel itself (focused on open) would leave the dialog as well
        if (e.shiftKey && (active === first || active === panel)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
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
              attrs,
            })
          }
          /* v8 ignore stop */
          const { class: closedAttrClass } = attrs as Record<string, unknown>
          return h('div', { class: cn('os-modal-wrapper', (closedAttrClass as string) || '') })
        }

        // --- Close button (native <button> for Vue 2/3 compatibility) ---
        const closeBtn = h(
          'button',
          {
            class:
              'os-modal__close absolute top-3 right-3 flex items-center justify-center w-[26px] h-[26px] rounded-full bg-transparent border-0 cursor-pointer p-0 hover:bg-[var(--color-default-hover)] text-[var(--color-default-contrast)]',
            ...htmlAttrs({
              type: 'button',
              'aria-label': props.closeLabel,
              'data-testid': 'os-modal-close',
            }),
            ...eventProps({ click: () => cancel('close') }),
          },
          [
            h(
              'span',
              {
                class: 'w-4 h-4 fill-current inline-flex',
                ...htmlAttrs({ 'aria-hidden': 'true' }),
              },
              [IconClose(createElement, isVue2)],
            ),
          ],
        )

        // --- Header ---
        const headerChildren: ReturnType<typeof h>[] = []
        if (props.title) {
          headerChildren.push(
            h(
              'h2',
              {
                class: 'os-modal__title text-[1.5rem] font-semibold m-0',
                ...htmlAttrs({ id: titleId }),
              },
              props.title,
            ),
          )
        }
        headerChildren.push(closeBtn)

        // Top fade: only visible when content is scrolled down
        if (isScrolled.value) {
          headerChildren.push(
            h('div', {
              class:
                'absolute bottom-0 left-0 w-[calc(100%-10px)] h-[30px] translate-y-full bg-gradient-to-b from-white to-transparent pointer-events-none z-10',
            }),
          )
        }

        const header = h(
          'div',
          { class: 'os-modal__header relative px-6 pt-5 pb-2 pr-12' },
          headerChildren,
        )

        // --- Content ---
        const content = h(
          'div',
          {
            class: 'os-modal__content px-6 pt-4 pb-6 overflow-y-auto max-h-[50vh]',
            ...htmlAttrs({ tabindex: '0' }),
            ...eventProps({ scroll: onContentScroll as (...args: unknown[]) => void }),
          },
          slots.default?.(),
        )

        // --- Footer ---
        let footerContent: ReturnType<typeof h>[] | undefined

        if (slots.footer) {
          footerContent = slots.footer({ confirm, cancel })
        } else {
          /* v8 ignore start -- Vue 2 branch: must use VNode data format for component props */
          if (isVue2) {
            footerContent = [
              h(
                OsButton,
                {
                  props: { appearance: 'ghost' },
                  attrs: { 'data-testid': 'os-modal-cancel' },
                  on: { click: () => cancel('cancel') },
                },
                [
                  h('template', { slot: 'icon' }, [IconClose(createElement, true)]),
                  props.cancelLabel,
                ],
              ),
              h(
                OsButton,
                {
                  props: { variant: 'primary' },
                  attrs: { 'data-testid': 'os-modal-confirm' },
                  on: { click: () => confirm() },
                },
                [
                  h('template', { slot: 'icon' }, [IconCheck(createElement, true)]),
                  props.confirmLabel,
                ],
              ),
            ]
          } else {
            /* v8 ignore stop */
            footerContent = [
              h(
                OsButton,
                {
                  appearance: 'ghost',
                  'data-testid': 'os-modal-cancel',
                  onClick: () => cancel('cancel'),
                },
                {
                  icon: () => [IconClose(createElement, false)],
                  default: () => [props.cancelLabel],
                },
              ),
              h(
                OsButton,
                {
                  variant: 'primary',
                  'data-testid': 'os-modal-confirm',
                  onClick: () => confirm(),
                },
                {
                  icon: () => [IconCheck(createElement, false)],
                  default: () => [props.confirmLabel],
                },
              ),
            ]
          }
        }

        const footer = h(
          'footer',
          {
            class:
              'os-modal__footer bg-[#f5f5f5] px-3 py-3 flex justify-end gap-2 rounded-b-lg shadow-[0_-20px_15px_-10px_rgba(255,255,255,0.9)]',
          },
          footerContent,
        )

        // --- Backdrop (click-to-close is handled on the overlay wrapper below) ---
        const backdrop = h('div', {
          class: 'os-modal__backdrop fixed inset-0 bg-black/70 z-[9998]',
          ...htmlAttrs({ 'data-testid': 'os-modal-backdrop' }),
        })

        // --- Panel (stops click propagation so overlay click only fires on backdrop area) ---
        const panelAttrs: Record<string, unknown> = {
          role: 'dialog',
          'aria-modal': 'true',
          // Focusable by script only: the fallback target when nothing inside asks for focus
          tabindex: '-1',
          'data-testid': 'os-modal-panel',
        }
        if (props.title) {
          panelAttrs['aria-labelledby'] = titleId
        } else {
          panelAttrs['aria-label'] = props.ariaLabel
        }

        const panel = h(
          'div',
          {
            class: panelClasses.value,
            ...htmlAttrs(panelAttrs),
            ...eventProps({
              keydown: onFocusTrap as (...args: unknown[]) => void,
              click: (e: unknown) => (e as Event).stopPropagation(),
            }),
            ref: modalRef,
          },
          [header, content, footer],
        )

        // --- Overlay: captures clicks outside the panel to close ---
        const overlayProps: Record<string, unknown> = {
          class: 'os-modal__overlay fixed inset-0 z-[9999] flex items-center justify-center',
          ...eventProps({
            click: () => cancel('backdrop'),
          }),
        }

        const overlay = h('div', overlayProps, [panel])

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
              attrs,
              on: listeners,
            },
            [backdrop, overlay],
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
          [backdrop, overlay],
        )
      }
    },
  })
</script>
