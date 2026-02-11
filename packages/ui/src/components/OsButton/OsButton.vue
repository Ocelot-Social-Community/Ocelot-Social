<script lang="ts">
  import { computed, defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '../../utils'

  import { buttonVariants } from './button.variants'

  import type { ButtonVariants } from './button.variants'
  import type { PropType } from 'vue-demi'

  export default defineComponent({
    name: 'OsButton',
    // In Vue 2, inheritAttrs must be false to manually forward attrs
    inheritAttrs: false,
    props: {
      variant: {
        type: String as PropType<ButtonVariants['variant']>,
        default: 'default',
      },
      appearance: {
        type: String as PropType<ButtonVariants['appearance']>,
        default: 'filled',
      },
      size: {
        type: String as PropType<ButtonVariants['size']>,
        default: 'md',
      },
      fullWidth: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String as PropType<'button' | 'submit' | 'reset'>,
        default: 'button',
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      circle: {
        type: Boolean,
        default: false,
      },
    },
    setup(props, { slots, attrs }) {
      const classes = computed(() =>
        cn(
          buttonVariants({
            variant: props.variant,
            appearance: props.appearance,
            size: props.size,
            fullWidth: props.fullWidth,
          }),
        ),
      )

      // Get component instance for Vue 2 $listeners access
      const instance = getCurrentInstance()

      const CIRCLE_WIDTHS: Record<string, string> = {
        sm: 'w-[26px]',
        md: 'w-[36px]',
        lg: 'w-12',
        xl: 'w-14',
      }

      const ICON_CLASS =
        'os-button__icon inline-flex items-center shrink-0 h-[1.2em] [&>svg]:h-full [&>svg]:w-auto [&>svg]:fill-current'

      return () => {
        const iconContent = slots.icon?.()
        const defaultContent = slots.default?.()
        const hasIcon = iconContent && iconContent.length > 0
        const hasText =
          defaultContent?.some((node: unknown) => {
            if (typeof node === 'string') return node.trim().length > 0
            const children = (node as Record<string, unknown>).children
            // Text VNodes have string children; element/component VNodes are always visible
            return typeof children !== 'string' || children.trim().length > 0
          }) ?? false

        const size = props.size ?? 'md'
        const isSmall = ['xs', 'sm'].includes(size)

        const circleClass = props.circle
          ? `rounded-full p-0 ${CIRCLE_WIDTHS[size] || CIRCLE_WIDTHS.md}`
          : ''

        const children: (string | ReturnType<typeof h>)[] = []
        if (hasIcon) {
          const iconMargin = props.circle ? '' : isSmall ? '' : hasText ? '-ml-1' : '-ml-1 -mr-1'
          children.push(h('span', { class: `${iconMargin} ${ICON_CLASS}` }, iconContent))
        }
        if (defaultContent && hasText) {
          children.push(...defaultContent)
        }

        const gapClass = hasIcon && hasText ? (isSmall ? 'gap-1' : 'gap-2') : ''

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // Vue 2: separate attrs and on (listeners)
          // $listeners contains event handlers like @click
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const listeners = proxy?.$listeners || {}
          // In Vue 2, class/style are not in $attrs - access via $vnode
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class

          return h(
            'button',
            {
              class: [classes.value, gapClass, circleClass, parentClass, parentDynClass].filter(Boolean),
              attrs: {
                type: props.type,
                disabled: props.disabled || undefined,
                'data-appearance': props.appearance,
                ...attrs,
              },
              on: listeners,
            },
            children,
          )
        }
        /* v8 ignore stop */
        // Vue 3: flat props, attrs includes listeners
        // Extract class from attrs to merge instead of overwrite
        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>
        return h(
          'button',
          {
            type: props.type,
            disabled: props.disabled,
            'data-appearance': props.appearance,
            class: cn(classes.value, gapClass, circleClass, (attrClass as string) || ''),
            ...restAttrs,
          },
          children,
        )
      }
    },
  })
</script>
