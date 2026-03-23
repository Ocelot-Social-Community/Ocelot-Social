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
        let menuItems: unknown[] = []

        if (slots.default) {
          const defaultContent = slots.default()
          menuItems = Array.isArray(defaultContent) ? defaultContent : [defaultContent]
        } else if (props.routes) {
          menuItems = props.routes.map((route, index) => {
            if (slots.menuitem) {
              const name = props.nameParser(route, [])
              return slots.menuitem({ route, parents: [], name })
            }
            const key = (route.path as string) || index

            if (isVue2) {
              return h(OsMenuItem, { key, props: { route } })
            }
            return h(OsMenuItem, { key, route })
          })
        }

        const listChildren = menuItems
          .flat(Infinity)
          .filter((item): item is ReturnType<typeof h> => item != null)
        const list = h('ul', { class: 'os-menu-list' }, listChildren)

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
              class: [cn('os-menu', parentClass as string), parentDynClass].filter(Boolean),
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
            class: cn('os-menu', (attrClass as string) || ''),
            ...restAttrs,
          },
          [list],
        )
      }
    },
    /* v8 ignore stop */
  })
</script>

<style>
  /* OsMenu — Navigation menu styles using CSS custom properties */

  .os-menu {
    margin: 0;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: 1.3;
    box-sizing: border-box;
  }

  ul.os-menu-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .os-menu-item {
    list-style: none;
  }

  .os-menu-item-link {
    display: block;
    box-sizing: border-box;
    color: var(--color-text-base, #4b4554);
    font-family: inherit;
    font-size: inherit;
    line-height: 1.3;
    text-decoration: none;
    padding: 8px 16px;
    border-left: 2px solid transparent;
    transition: color 80ms ease-out,
                background-color 80ms ease-out,
                border-left-color 80ms ease-out;
    cursor: pointer;
  }

  .os-menu-item-link:hover {
    color: var(--color-primary, #17b53f);
  }

  /* Active state via vue-router (automatic) */
  .os-menu-item-link.router-link-active {
    color: var(--color-primary, #17b53f);
  }

  .os-menu-item-link.router-link-exact-active {
    color: var(--color-primary, #17b53f);
    background-color: var(--color-background-soft, #faf9fa);
    border-left-color: var(--color-primary, #17b53f);
  }

  /* Active state via matcher prop (manual) */
  .os-menu-item-link.os-menu-item--active {
    color: var(--color-primary, #17b53f);
    background-color: var(--color-background-soft, #faf9fa);
    border-left-color: var(--color-primary, #17b53f);
  }

  /* Nesting levels */
  .os-menu-item-level-1 .os-menu-item-link {
    font-size: 0.875rem;
    padding-left: 24px;
  }

  .os-menu-item-level-2 .os-menu-item-link {
    font-size: 0.875rem;
    padding-left: 32px;
  }

  /* Submenu list */
  ul.os-menu-item-submenu {
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
