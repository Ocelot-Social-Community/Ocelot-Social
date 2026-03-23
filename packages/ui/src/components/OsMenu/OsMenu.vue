<script lang="ts">
  import { defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '#src/utils'

  import OsMenuItem from './OsMenuItem.vue'

  import type { Component, PropType } from 'vue-demi'

  /**
   * Navigation menu component that renders a list of route items.
   *
   * Use the `menuitem` scoped slot to customize how each item is rendered.
   * Pass `link-tag` to control which element renders links (e.g. `'nuxt-link'`).
   *
   * @slot default - Override entire menu content
   * @slot menuitem - Custom menu item template (scoped: { route, parents, name })
   */
  export default defineComponent({
    name: 'OsMenu',
    components: { OsMenuItem },
    inheritAttrs: false,
    provide() {
      return {
        $parentMenu: this,
      }
    },
    props: {
      /** Array of route objects to display */
      routes: {
        type: Array as PropType<Record<string, unknown>[]>,
        default: null,
      },
      /** Component or tag used for links */
      linkTag: {
        type: [String, Object, Function] as PropType<string | Component>,
        default: 'a',
      },
      /** Function to extract URL from a route */
      urlParser: {
        type: Function as PropType<
          (route: Record<string, unknown>, parents: Record<string, unknown>[]) => string
        >,
        default: (route: Record<string, unknown>) => {
          return (route.path as string) || '/'
        },
      },
      /** Function to extract display name from a route */
      nameParser: {
        type: Function as PropType<
          (route: Record<string, unknown>, parents: Record<string, unknown>[]) => string
        >,
        default: (route: Record<string, unknown>) => {
          return (route.name as string) || ''
        },
      },
      /** Custom matcher function for active state */
      matcher: {
        type: Function as PropType<
          (url: string, route: Record<string, unknown>) => boolean
        >,
        default: () => false,
      },
      /** Function to check if URL must match exactly */
      isExact: {
        type: Function as PropType<(url: string) => boolean>,
        default: (url: string) => url === '/',
      },
    },
    methods: {
      handleNavigate() {
        this.$emit('navigate')
      },
    },
    /* v8 ignore start -- render function tested via unit + visual tests */
    setup(props, { slots, attrs, emit }) {
      const instance = isVue2 ? getCurrentInstance() : null

      return () => {
        // Build menu items from routes
        let menuItems: ReturnType<typeof h>[] = []

        if (slots.default) {
          // Use default slot if provided (full override)
          const defaultContent = slots.default()
          menuItems = Array.isArray(defaultContent) ? defaultContent : [defaultContent]
        } else if (props.routes) {
          menuItems = props.routes.map((route, index) => {
            // If menuitem scoped slot is provided, use it
            if (slots.menuitem) {
              const name = props.nameParser(route, [])
              return slots.menuitem({ route, parents: [], name })
            }
            // Default: render OsMenuItem
            const key = (route.path as string) || index

            if (isVue2) {
              return h(OsMenuItem, { key, props: { route } })
            }
            return h(OsMenuItem, { key, route })
          })
        }

        const listChildren = menuItems
          .flat(Infinity)
          .filter((item) => item != null && item !== '' && !(Array.isArray(item) && item.length === 0))
        const list = h('ul', { class: 'ds-menu-list' }, listChildren)

        if (isVue2) {
          const proxy = instance?.proxy as Record<string, unknown> | undefined
          const parentClass =
            (proxy?.$vnode as Record<string, Record<string, unknown>> | undefined)?.data
              ?.staticClass || ''
          const parentDynClass =
            (proxy?.$vnode as Record<string, Record<string, unknown>> | undefined)?.data?.class

          return h(
            'nav',
            {
              class: [cn('ds-menu', parentClass as string), parentDynClass].filter(Boolean),
              attrs,
              on: { navigate: () => emit('navigate') },
            },
            [list],
          )
        }

        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>
        return h(
          'nav',
          {
            class: cn('ds-menu', (attrClass as string) || ''),
            ...restAttrs,
          },
          [list],
        )
      }
    },
    /* v8 ignore stop */
  })
</script>
