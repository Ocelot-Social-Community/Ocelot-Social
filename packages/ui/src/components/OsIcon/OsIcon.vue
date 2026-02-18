<script lang="ts">
  import { defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '#src/utils'

  import { ICON_SIZES } from './icon.variants'
  import { SYSTEM_ICONS } from './icons'

  import type { Size } from '#src/types'
  import type { SystemIconName } from './icons'
  import type { ClassValue } from 'clsx'
  import type { Component, PropType } from 'vue-demi'

  /**
   * Renders system icons by name or custom Vue components.
   * @prop name - System icon name (e.g. 'close', 'check')
   * @prop icon - Vue component to render as icon (takes precedence over name)
   * @prop size - Icon size (xs/sm/md/lg/xl/2xl)
   */
  export default defineComponent({
    name: 'OsIcon',
    inheritAttrs: false,
    props: {
      name: {
        type: String,
        default: undefined,
      },
      icon: {
        type: [Object, Function] as PropType<Component>,
        default: undefined,
      },
      size: {
        type: String as PropType<Size>,
        default: 'md',
      },
    },
    setup(props, { attrs }) {
      /* v8 ignore start -- Vue 2 only */
      const instance = isVue2 ? getCurrentInstance() : null
      /* v8 ignore stop */

      return () => {
        // icon prop takes precedence over name
        const iconComponent =
          props.icon || (props.name ? SYSTEM_ICONS[props.name as SystemIconName] : undefined)

        if (!iconComponent) return null

        const sizeClass = ICON_SIZES[props.size]

        // Vue 2's h() cannot handle plain arrow functions as components (only
        // constructor functions or option objects). Icon render functions are
        // arrow functions that accept optional (h, isVue2) and return VNodes.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isRenderFn = typeof iconComponent === 'function' && !(iconComponent as any).cid
        // In Vue 2, pass $createElement (bound to this instance) so icons avoid
        // the globally-imported h() which requires currentInstance in Vue 2.7.
        const createElement = /* v8 ignore next -- Vue 2 only */ isVue2
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (instance?.proxy as any)?.$createElement
          : h

        const iconVNode = isRenderFn
          ? (iconComponent as (...args: unknown[]) => ReturnType<typeof h>)(createElement, isVue2)
          : h(iconComponent)

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class
          const parentAttrs = proxy?.$vnode?.data?.attrs || {}

          const hasLabel = !!(parentAttrs['aria-label'] || attrs['aria-label'])
          const a11yAttrs = hasLabel
            ? { role: 'img', 'aria-label': parentAttrs['aria-label'] || attrs['aria-label'] }
            : { 'aria-hidden': 'true' }

          return h(
            'span',
            {
              class: cn(
                'os-icon inline-flex items-center align-bottom shrink-0',
                sizeClass,
                '[&>svg]:h-full [&>svg]:w-auto [&>svg]:fill-current',
                parentClass,
                parentDynClass,
              ),
              attrs: { ...a11yAttrs, ...parentAttrs, ...attrs },
            },
            [iconVNode],
          )
        }
        /* v8 ignore stop */

        const {
          class: attrClass,
          'aria-label': ariaLabel,
          ...restAttrs
        } = attrs as Record<string, unknown>
        const hasLabel = !!ariaLabel
        const a11yAttrs = hasLabel
          ? { role: 'img', 'aria-label': ariaLabel }
          : { 'aria-hidden': 'true' }

        return h(
          'span',
          {
            class: cn(
              'os-icon inline-flex items-center align-bottom shrink-0',
              sizeClass,
              '[&>svg]:h-full [&>svg]:w-auto [&>svg]:fill-current',
              attrClass as ClassValue,
            ),
            ...a11yAttrs,
            ...restAttrs,
          },
          [iconVNode],
        )
      }
    },
  })
</script>
