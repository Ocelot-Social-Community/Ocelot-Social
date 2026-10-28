<script lang="ts">
  import {
    computed,
    defineComponent,
    getCurrentInstance,
    h,
    isVue2,
    nextTick,
    ref,
    watch,
  } from 'vue-demi'

  import { cn } from '#src/utils'
  import { renderCloseButton } from '#src/utils/closeButton'
  import { trapFocus, useBodyScrollLock, useEscapeKey } from '#src/utils/dialog'

  import { drawerPanelVariants } from './drawer.variants'

  import type { DrawerSide } from './drawer.variants'
  import type { PropType } from 'vue-demi'

  /**
   * A panel that slides in from a screen edge over the page — for content that belongs next
   * to the page rather than in front of it (a sidebar on a small screen, say).
   *
   * Behaves as a modal dialog: a backdrop, the focus kept inside, the page behind it held
   * still. Escape, the backdrop and the close button close it, and the focus returns to where
   * it was before it opened.
   *
   * Vue 2: `<os-drawer :open.sync="show" />`
   * Vue 3: `<os-drawer v-model:open="show" />`
   *
   * @slot default - Drawer content
   */
  export default defineComponent({
    name: 'OsDrawer',
    inheritAttrs: false,
    props: {
      /** Whether the drawer is open */
      open: {
        type: Boolean,
        default: false,
      },
      /** The screen edge the drawer slides in from */
      side: {
        type: String as PropType<DrawerSide>,
        default: 'right',
      },
      /** Accessible name of the drawer */
      ariaLabel: {
        type: String,
        default: 'Drawer',
      },
      /** Accessible label of the close button */
      closeLabel: {
        type: String,
        default: 'Close',
      },
    },
    emits: ['update:open', 'close', 'opened'],
    setup(props, { slots, attrs, emit }) {
      const panelRef = ref<HTMLElement | null>(null)
      // Where the focus was before the drawer opened, to give it back on close.
      let returnFocusTo: HTMLElement | null = null

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

      // Vue 2 takes HTML attributes under `attrs` and drops them at the top level; Vue 3 takes
      // them flat. Element data is written the Vue 3 way and moved here for Vue 2.
      function elementData(data: Record<string, unknown>): Record<string, unknown> {
        /* v8 ignore start -- Vue 2 branch */
        if (isVue2) {
          const { class: className, ref: elementRef, key, on, ...attributes } = data
          return { class: className, ref: elementRef, key, on, attrs: attributes }
        }
        /* v8 ignore stop */
        return data
      }

      function close(type: 'close' | 'backdrop' | 'escape') {
        emit('update:open', false)
        emit('close', type)
      }

      useBodyScrollLock(() => props.open)
      useEscapeKey(
        () => props.open,
        () => close('escape'),
      )

      watch(
        () => props.open,
        async (open, wasOpen) => {
          if (open) {
            returnFocusTo = document.activeElement as HTMLElement | null
            emit('opened')
            await nextTick()
            panelRef.value?.focus()
          } else if (wasOpen) {
            // Only where it can still go: the element may have left the page meanwhile.
            if (returnFocusTo?.isConnected) {
              returnFocusTo.focus()
            }
            returnFocusTo = null
          }
        },
        { immediate: true },
      )

      // Opening, the panel is visible at once and only slides: an element is still hidden at the
      // start of a visibility transition, and focusing it then would go nowhere. Closing, it
      // hides once it has slid out.
      const panelClasses = computed(() =>
        cn(
          drawerPanelVariants({ side: props.side }),
          props.open
            ? 'translate-x-0 visible [transition:transform_200ms_ease-out]'
            : 'invisible [transition:transform_200ms_ease-out,visibility_0s_linear_200ms]',
        ),
      )

      return () => {
        const closeButton = renderCloseButton({
          class: 'os-drawer__close self-end m-2 mb-0 shrink-0',
          label: props.closeLabel,
          testId: 'os-drawer-close',
          onClick: () => close('close'),
          createElement,
        })

        const content = h('div', { class: 'os-drawer__content px-4 pb-4' }, slots.default?.())

        const panelProps: Record<string, unknown> = {
          // Keyed, like the backdrop: it comes and goes in front of the panel, and unkeyed the
          // renderer would turn the panel into the backdrop and remount everything inside.
          key: 'panel',
          class: panelClasses.value,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': props.ariaLabel,
          tabindex: '-1',
          'data-testid': 'os-drawer-panel',
          ref: panelRef,
          ...eventProps({
            keydown: ((e: KeyboardEvent) => {
              trapFocus(panelRef.value, e)
            }) as (...args: unknown[]) => void,
          }),
        }
        return renderRoot(h('div', elementData(panelProps), [closeButton, content]))
      }

      function renderRoot(panel: ReturnType<typeof h>) {
        const children = [panel]
        if (props.open) {
          children.unshift(
            h(
              'div',
              elementData({
                key: 'backdrop',
                class: 'os-drawer__backdrop fixed inset-0 bg-black/50 z-[9998]',
                'data-testid': 'os-drawer-backdrop',
                ...eventProps({ click: () => close('backdrop') }),
              }),
            ),
          )
        }

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class
          return h(
            'div',
            {
              class: ['os-drawer-wrapper', parentClass, parentDynClass].filter(Boolean),
              attrs,
              on: proxy?.$listeners || {},
            },
            children,
          )
        }
        /* v8 ignore stop */

        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>
        return h(
          'div',
          { class: cn('os-drawer-wrapper', (attrClass as string) || ''), ...restAttrs },
          children,
        )
      }
    },
  })
</script>
