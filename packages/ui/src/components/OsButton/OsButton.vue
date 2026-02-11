<script lang="ts">
  import { computed, defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '../../utils'

  import { buttonVariants } from './button.variants'

  import type { ButtonVariants } from './button.variants'
  import type { PropType } from 'vue-demi'

  const CIRCLE_WIDTHS: Record<string, string> = {
    sm: 'w-[26px]',
    md: 'w-[36px]',
    lg: 'w-12',
    xl: 'w-14',
  }

  const ICON_CLASS =
    'os-button__icon inline-flex items-center shrink-0 h-[1.2em] [&>svg]:h-full [&>svg]:w-auto [&>svg]:fill-current'

  const SPINNER_PX: Record<string, number> = { sm: 24, md: 32, lg: 40, xl: 46 }

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

  function createSpinner(px: number, center: string) {
    /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
    const svg = isVue2
      ? h('svg', { attrs: SVG_ATTRS, style: 'width:100%;height:100%;overflow:hidden' }, [
          h('circle', { attrs: CIRCLE_ATTRS, style: CIRCLE_STYLE }),
        ])
      : /* v8 ignore stop */
        h('svg', { ...SVG_ATTRS, style: 'width:100%;height:100%;overflow:hidden' }, [
          h('circle', { ...CIRCLE_ATTRS, style: CIRCLE_STYLE }),
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

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const size = props.size!
        // eslint-disable-next-line security/detect-object-injection -- size is a validated prop
        const spinnerPx = SPINNER_PX[size]
        const isSmall = props.circle || size === 'sm'
        const isLoading = props.loading
        const isDisabled = props.disabled || isLoading

        // eslint-disable-next-line security/detect-object-injection -- size is a validated prop
        const circleClass = props.circle ? `rounded-full p-0 ${CIRCLE_WIDTHS[size]}` : ''

        // --- Build inner children (icon + text) ---
        const innerChildren: ReturnType<typeof h>[] = []

        if (hasIcon) {
          const iconMargin = isSmall ? '' : hasText ? '-ml-1' : '-ml-1 -mr-1'
          const loadingClass = isLoading ? 'relative overflow-visible' : ''
          const iconChildren = isLoading
            ? [
                /* v8 ignore next -- iconContent guaranteed truthy by hasIcon check */
                ...(iconContent || []),
                createSpinner(spinnerPx, 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'),
              ]
            : iconContent
          innerChildren.push(
            h('span', { class: `${iconMargin} ${ICON_CLASS} ${loadingClass}` }, iconChildren),
          )
        }

        if (defaultContent && hasText) {
          innerChildren.push(...(defaultContent as ReturnType<typeof h>[]))
        }

        const gapClass = hasIcon && hasText ? (isSmall ? 'gap-1' : 'gap-2') : ''
        const contentWrapper = h(
          'span',
          { class: `inline-flex items-center ${gapClass}` },
          innerChildren,
        )

        const buttonSpinner =
          isLoading && !hasIcon ? createSpinner(spinnerPx, 'inset-0 m-auto') : null

        const children = buttonSpinner ? [contentWrapper, buttonSpinner] : [contentWrapper]

        const buttonClass = cn(variantClasses.value, circleClass)

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
            class: cn(buttonClass, (attrClass as string) || ''),
            ...restAttrs,
          },
          children,
        )
      }
    },
  })
</script>
