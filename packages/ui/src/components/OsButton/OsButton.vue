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
      loading: {
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

      const SPINNER_INLINE: Record<string, string> = {
        sm: 'width:24px;height:24px',
        md: 'width:32px;height:32px',
        lg: 'width:40px;height:40px',
        xl: 'width:46px;height:46px',
      }
      // Smaller spinner when replacing an icon (slightly larger than icon's 1.2em)
      const ICON_SPINNER_INLINE: Record<string, string> = {
        sm: 'width:16px;height:16px',
        md: 'width:22px;height:22px',
        lg: 'width:26px;height:26px',
        xl: 'width:30px;height:30px',
      }

      return () => {
        const iconContent = slots.icon?.()
        const defaultContent = slots.default?.()
        const hasIcon = iconContent && iconContent.length > 0
        const hasText =
          defaultContent?.some((node: unknown) => {
            const children = (node as Record<string, unknown>).children
            // Text VNodes have string children; element/component VNodes are always visible
            return typeof children !== 'string' || children.trim().length > 0
          }) ?? false

        const size = props.size!
        const isSmall = ['xs', 'sm'].includes(size)
        const isLoading = props.loading

        const circleClass = props.circle ? `rounded-full p-0 ${CIRCLE_WIDTHS[size]}` : ''

        // Build spinner VNode with inline size (immune to parent [&>svg] rules)
        const createSpinner = (extraClass: string, opts: { forceVisible?: boolean; iconSize?: boolean } = {}) => {
          const sizeStyle = opts.iconSize ? ICON_SPINNER_INLINE[size] : SPINNER_INLINE[size]
          let style = `${sizeStyle};animation:os-spinner-rotate 16s linear infinite`
          if (opts.forceVisible) style += ';visibility:visible'
          const svgProps = isVue2
            ? /* v8 ignore next */ {
                class: `os-button__spinner absolute ${extraClass}`,
                attrs: {
                  viewBox: '0 0 50 50',
                  xmlns: 'http://www.w3.org/2000/svg',
                  'aria-hidden': 'true',
                },
                style,
              }
            : {
                class: `os-button__spinner absolute ${extraClass}`,
                viewBox: '0 0 50 50',
                xmlns: 'http://www.w3.org/2000/svg',
                'aria-hidden': 'true',
                style,
              }
          const circleProps = isVue2
            ? /* v8 ignore next */ {
                attrs: {
                  cx: '25',
                  cy: '25',
                  r: '20',
                  fill: 'none',
                  stroke: 'currentColor',
                  'stroke-width': '4',
                  'stroke-linecap': 'round',
                },
                style: 'animation: os-spinner-dash 1.5s ease-in-out infinite',
              }
            : {
                cx: '25',
                cy: '25',
                r: '20',
                fill: 'none',
                stroke: 'currentColor',
                'stroke-width': '4',
                'stroke-linecap': 'round',
                style: 'animation: os-spinner-dash 1.5s ease-in-out infinite',
              }
          return h('svg', svgProps, [h('circle', circleProps)])
        }

        const innerChildren: (string | ReturnType<typeof h>)[] = []
        if (hasIcon) {
          const iconMargin = props.circle ? '' : isSmall ? '' : hasText ? '-ml-1' : '-ml-1 -mr-1'
          innerChildren.push(
            h(
              'span',
              {
                class: `${iconMargin} ${ICON_CLASS} ${isLoading ? 'relative overflow-visible [&>*]:invisible' : ''}`,
              },
              isLoading
                ? [
                    ...(iconContent || []),
                    createSpinner('top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', {
                      forceVisible: true,
                      iconSize: true,
                    }),
                  ]
                : iconContent,
            ),
          )
        }
        if (defaultContent && hasText) {
          innerChildren.push(...defaultContent)
        }

        const gapClass = hasIcon && hasText ? (isSmall ? 'gap-1' : 'gap-2') : ''

        // Wrap content in a span
        const contentClass = `inline-flex items-center ${gapClass}`
        const contentWrapper = h('span', { class: contentClass }, innerChildren)

        // No icon: spinner centered over the whole button
        const buttonSpinner =
          isLoading && !hasIcon
            ? createSpinner('top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2')
            : null

        const children = buttonSpinner ? [contentWrapper, buttonSpinner] : [contentWrapper]

        const isDisabled = props.disabled || isLoading

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
              class: [
                classes.value,
                'relative inline-flex items-center justify-center',
                circleClass,
                parentClass,
                parentDynClass,
              ].filter(Boolean),
              attrs: {
                type: props.type,
                disabled: isDisabled || undefined,
                'data-appearance': props.appearance,
                'aria-busy': isLoading || undefined,
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
            disabled: isDisabled || undefined,
            'data-appearance': props.appearance,
            'aria-busy': isLoading || undefined,
            class: cn(
              classes.value,
              'relative inline-flex items-center justify-center',
              circleClass,
              (attrClass as string) || '',
            ),
            ...restAttrs,
          },
          children,
        )
      }
    },
  })
</script>
