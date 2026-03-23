<script lang="ts">
  import { defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '#src/utils'

  import type { Component, PropType } from 'vue-demi'

  /**
   * Individual menu item used inside OsMenu.
   * Injects `$parentMenu` to access menu-level configuration.
   *
   * @slot default - Custom item label content
   */
  export default defineComponent({
    name: 'OsMenuItem',
    inject: {
      $parentMenu: {
        default: null,
      },
    },
    inheritAttrs: false,
    props: {
      /** Route object with name, path, children, etc. */
      route: {
        type: Object as PropType<Record<string, unknown>>,
        default: null,
      },
      /** Parent routes for nesting level calculation */
      parents: {
        type: Array as PropType<Record<string, unknown>[]>,
        default: () => [],
      },
      /** Override link component for this item */
      linkTag: {
        type: [String, Object, Function] as PropType<string | Component>,
        default: null,
      },
    },
    emits: ['click'],
    /* v8 ignore start -- render function tested via unit + visual tests */
    setup(props, { slots, attrs }) {
      const instance = isVue2 ? getCurrentInstance() : null

      // We need access to component instance for inject, so use render in setup
      return () => {
        // Access component instance for inject values
        const proxy = instance?.proxy as Record<string, unknown> | undefined
        const vm = (isVue2 ? proxy : getCurrentInstance()?.proxy) as Record<string, unknown>

        if (!vm || !props.route) return null

        const resolvedLinkTag = vm.resolvedLinkTag as string | Component
        const matcherResult = vm.matcherResult as boolean
        const isExact = vm.isExact as boolean
        const name = vm.name as string
        const level = vm.level as number
        const bindings = vm.bindings as Record<string, unknown>
        const hasSubmenu = vm.hasSubmenu as boolean
        const showSubmenu = vm.showSubmenu as boolean
        const handleClick = vm.handleClick as (e: Event) => void

        // Build link element
        const linkClass = cn('os-menu-item-link', matcherResult && 'os-menu-item--active')

        const defaultSlotContent = slots.default?.()
        const linkChildren = defaultSlotContent || [name]

        let linkNode: ReturnType<typeof h>
        if (isVue2) {
          linkNode = h(
            resolvedLinkTag,
            {
              class: linkClass,
              props: { ...bindings, exact: isExact },
              attrs: bindings,
              on: { click: handleClick },
              ref: 'link',
            },
            linkChildren,
          )
        } else {
          linkNode = h(
            resolvedLinkTag,
            {
              class: linkClass,
              ...bindings,
              exact: isExact,
              onClick: handleClick,
              ref: 'link',
            },
            linkChildren,
          )
        }

        // Build submenu if children exist
        const children: ReturnType<typeof h>[] = [linkNode]
        if (hasSubmenu) {
          const OsMenuItemSelf = vm.$options as Component
          const submenuItems = (props.route.children as Record<string, unknown>[]).map((child) => {
            const childProps = {
              route: child,
              parents: [...props.parents, props.route],
            }
            if (isVue2) {
              return h(OsMenuItemSelf, { key: child.name as string, props: childProps })
            }
            return h(OsMenuItemSelf, { key: child.name as string, ...childProps })
          })
          children.push(h('ul', { class: 'os-menu-item-submenu' }, submenuItems))
        }

        // Build li wrapper
        const liClass = cn(
          'os-menu-item',
          `os-menu-item-level-${String(level)}`,
          showSubmenu && 'os-menu-item-show-submenu',
        )

        if (isVue2) {
          const parentClass =
            (proxy?.$vnode as Record<string, Record<string, unknown>> | undefined)?.data
              ?.staticClass || ''
          const parentDynClass = (
            proxy?.$vnode as Record<string, Record<string, unknown>> | undefined
          )?.data?.class
          const listeners = (proxy as Record<string, unknown>)?.$listeners as
            | Record<string, unknown>
            | undefined

          return h(
            'li',
            {
              class: [cn(liClass, parentClass as string), parentDynClass].filter(Boolean),
              attrs,
              on: {
                ...(listeners || {}),
                click: handleClick,
              },
            },
            children,
          )
        }

        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>
        return h(
          'li',
          {
            class: cn(liClass, (attrClass as string) || ''),
            onClick: handleClick,
            ...restAttrs,
          },
          children,
        )
      }
    },
    data() {
      return {
        showSubmenu: false,
        clickOutsideHandler: null as ((e: Event) => void) | null,
      }
    },
    computed: {
      resolvedLinkTag(): string | Component {
        if (this.linkTag) return this.linkTag
        const menu = this.$parentMenu as Record<string, unknown> | null
        return (menu?.linkTag as string | Component) || 'a'
      },
      hasSubmenu(): boolean {
        const children = this.route?.children as unknown[] | undefined
        return Boolean(children && children.length)
      },
      url(): string {
        const menu = this.$parentMenu as Record<string, unknown> | null
        const parser = menu?.urlParser as (
          r: Record<string, unknown>,
          p: Record<string, unknown>[],
        ) => string
        return parser ? parser(this.route, this.parents) : (this.route?.path as string) || '/'
      },
      name(): string {
        const menu = this.$parentMenu as Record<string, unknown> | null
        const parser = menu?.nameParser as (
          r: Record<string, unknown>,
          p: Record<string, unknown>[],
        ) => string
        return parser ? parser(this.route, this.parents) : (this.route?.name as string) || ''
      },
      isExact(): boolean {
        const menu = this.$parentMenu as Record<string, unknown> | null
        const fn = menu?.isExact as ((url: string) => boolean) | undefined
        return fn ? fn(this.url) : this.url === '/'
      },
      matcherResult(): boolean {
        const menu = this.$parentMenu as Record<string, unknown> | null
        const fn = menu?.matcher as
          | ((url: string, route: Record<string, unknown>) => boolean)
          | undefined
        return fn ? fn(this.url, this.route) : false
      },
      level(): number {
        return this.parents.length
      },
      bindings(): Record<string, unknown> {
        const tag = this.resolvedLinkTag
        if (tag === 'router-link' || tag === 'nuxt-link') {
          // Support { name, params } objects for vue-router
          if (this.route?.name && this.route?.params && !this.route?.path) {
            return { to: { name: this.route.name, params: this.route.params } }
          }
          return { to: this.url }
        }
        if (tag === 'a') {
          return { href: this.url }
        }
        // Custom component — pass to
        return { to: this.url }
      },
    },
    mounted() {
      this.clickOutsideHandler = (e: Event) => {
        if (this.showSubmenu && !this.$el.contains(e.target as Node)) {
          this.showSubmenu = false
        }
      }
      document.addEventListener('click', this.clickOutsideHandler, true)
    },
    beforeUnmount() {
      if (this.clickOutsideHandler) {
        document.removeEventListener('click', this.clickOutsideHandler, true)
      }
    },
    methods: {
      handleClick(event: Event) {
        this.$emit('click', event, this.route)
        const menu = this.$parentMenu as Record<string, unknown> | null
        if (menu && typeof menu.handleNavigate === 'function') {
          ;(menu.handleNavigate as () => void)()
        }
      },
    },
    /* v8 ignore stop */
  })
</script>
