<script lang="ts">
  import { computed, defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '#src/utils'

  import { buttonVariants } from './button.variants'

  import type { ButtonVariants } from './button.variants'
  import type { PropType } from 'vue-demi'

  /**
   * Flexible button component with optional icon slot.
   * @slot default - Button content (text or HTML)
   * @slot icon - Optional icon (rendered left of text). Use aria-label for icon-only buttons.
   */

  type Size = NonNullable<ButtonVariants['size']>

  const CIRCLE_WIDTHS: Record<Size, string> = {
    sm: 'w-[26px]',
    md: 'w-[36px]',
    lg: 'w-12',
    xl: 'w-14',
  }

  const ICON_CLASS =
    'os-button__icon inline-flex items-center shrink-0 h-[1.2em] [&>svg]:h-full [&>svg]:w-auto [&>svg]:fill-current'

  const SPINNER_PX: Record<Size, number> = { sm: 24, md: 32, lg: 40, xl: 46 }

  const SVG_ATTRS = {
    viewBox: '0 0 50 50',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
  }

  const CIRCLE_ATTRS = {
    cx: '25',
    cy: '25',
    r: '20',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '4',
    'stroke-linecap': 'round',
  }

  const CIRCLE_STYLE =
    'transform-origin:25px 25px;animation:os-spinner-rotate 16s linear infinite,os-spinner-dash 1.5s ease-in-out infinite'

  function vueAttrs(attrs: Record<string, string>, style?: string) {
    /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
    return isVue2 ? { attrs, ...(style && { style }) } : { ...attrs, ...(style && { style }) }
    /* v8 ignore stop */
  }

  function createSpinner(px: number, center: string) {
    const svg = h('svg', vueAttrs(SVG_ATTRS, 'width:100%;height:100%;overflow:hidden'), [
      h('circle', vueAttrs(CIRCLE_ATTRS, CIRCLE_STYLE)),
    ])
    return h(
      'span',
      { class: `os-button__spinner absolute ${center}`, style: `width:${px}px;height:${px}px` },
      [svg],
    )
  }

  export default defineComponent({
    name: 'OsButton',
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
      const variantClasses = computed(() =>
        buttonVariants({
          variant: props.variant,
          appearance: props.appearance,
          size: props.size,
          fullWidth: props.fullWidth,
        }),
      )

      /* v8 ignore start -- Vue 2 only */
      const instance = isVue2 ? getCurrentInstance() : null
      /* v8 ignore stop */

      return () => {
        const iconContent = slots.icon?.()
        const defaultContent = slots.default?.()
        const hasIcon = iconContent && iconContent.length > 0
        const hasText =
          defaultContent?.some((node: unknown) => {
            const children = (node as Record<string, unknown>).children
            return typeof children !== 'string' || children.trim().length > 0
          }) ?? false

        const size = props.size as Size
        const spinnerPx = SPINNER_PX[size] // eslint-disable-line security/detect-object-injection
        const isSmall = props.circle || size === 'sm'
        const isLoading = props.loading
        const isDisabled = props.disabled || isLoading

        // --- Build inner children (icon + text) ---
        const innerChildren: ReturnType<typeof h>[] = []

        if (hasIcon) {
          const iconChildren = isLoading
            ? [
                /* v8 ignore next -- iconContent guaranteed truthy by hasIcon check */
                ...(iconContent || []),
                createSpinner(spinnerPx, 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'),
              ]
            : iconContent
          innerChildren.push(
            h(
              'span',
              {
                class: cn(
                  ICON_CLASS,
                  !isSmall && (hasText ? '-ml-1' : '-ml-1 -mr-1'),
                  isLoading && 'relative overflow-visible',
                ),
              },
              iconChildren,
            ),
          )
        }

        if (defaultContent && hasText) {
          innerChildren.push(...(defaultContent as ReturnType<typeof h>[]))
        }

        const contentWrapper = h(
          'span',
          {
            class: cn(
              'inline-flex items-center',
              hasIcon && hasText && (isSmall ? 'gap-1' : 'gap-2'),
            ),
          },
          innerChildren,
        )

        const children =
          isLoading && !hasIcon
            ? [contentWrapper, createSpinner(spinnerPx, 'inset-0 m-auto')]
            : [contentWrapper]

        const buttonClass = cn(
          'os-button',
          variantClasses.value,
          props.circle && 'rounded-full p-0',
          props.circle && CIRCLE_WIDTHS[size], // eslint-disable-line security/detect-object-injection
        )

        const buttonData = {
          type: props.type,
          disabled: isDisabled || undefined,
          'data-variant': props.variant,
          'data-appearance': props.appearance,
          'aria-busy': isLoading || undefined,
        }

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const listeners = proxy?.$listeners || {}
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class

          return h(
            'button',
            {
              class: [buttonClass, parentClass, parentDynClass].filter(Boolean),
              attrs: { ...buttonData, ...attrs },
              on: listeners,
            },
            children,
          )
        }
        /* v8 ignore stop */

        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>
        return h(
          'button',
          {
            ...buttonData,
            class: cn(buttonClass, attrClass || ''),
            ...restAttrs,
          },
          children,
        )
      }
    },
  })
</script>
