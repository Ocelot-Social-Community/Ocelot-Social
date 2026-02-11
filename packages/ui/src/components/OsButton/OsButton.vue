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

  /** Spinner dimensions (inline style) — full-size for text-only buttons */
  const SPINNER_SIZE: Record<string, string> = {
    sm: 'width:24px;height:24px',
    md: 'width:32px;height:32px',
    lg: 'width:40px;height:40px',
    xl: 'width:46px;height:46px',
  }

  /** Smaller spinner when overlaying an icon */
  const ICON_SPINNER_SIZE: Record<string, string> = {
    sm: 'width:16px;height:16px',
    md: 'width:22px;height:22px',
    lg: 'width:26px;height:26px',
    xl: 'width:30px;height:30px',
  }

  const SPINNER_CENTER = 'inset-0 m-auto'

  const CIRCLE_ATTRS = {
    cx: '25',
    cy: '25',
    r: '20',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '4',
    'stroke-linecap': 'round',
  }

  /** Both animations on the circle — SVG stays static to avoid wobble */
  const CIRCLE_STYLE =
    'transform-origin:25px 25px;animation:os-spinner-rotate 16s linear infinite,os-spinner-dash 1.5s ease-in-out infinite'

  /** SVG style: fills wrapper, no animation (purely a container) */
  const SVG_STYLE = 'width:100%;height:100%;overflow:hidden'

  function createSpinner(sizeStyle: string, extraClass: string, forceVisible: boolean) {
    /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
    const svg = isVue2
      ? h(
          'svg',
          {
            attrs: {
              viewBox: '0 0 50 50',
              xmlns: 'http://www.w3.org/2000/svg',
              'aria-hidden': 'true',
            },
            style: SVG_STYLE,
          },
          [h('circle', { attrs: CIRCLE_ATTRS, style: CIRCLE_STYLE })],
        )
      : /* v8 ignore stop */
        h(
          'svg',
          {
            viewBox: '0 0 50 50',
            xmlns: 'http://www.w3.org/2000/svg',
            'aria-hidden': 'true',
            style: SVG_STYLE,
          },
          [h('circle', { ...CIRCLE_ATTRS, style: CIRCLE_STYLE })],
        )

    // Wrapper carries positioning + size; SVG inside only rotates.
    // Separating position from transform avoids sub-pixel wobble.
    const wrapperStyle = `${sizeStyle}${forceVisible ? ';visibility:visible' : ''}`
    return h('span', { class: `os-button__spinner absolute ${extraClass}`, style: wrapperStyle }, [
      svg,
    ])
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

      const instance = getCurrentInstance()

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
        const isSmall = ['xs', 'sm'].includes(size)
        const isLoading = props.loading
        const isDisabled = props.disabled || isLoading

        // eslint-disable-next-line security/detect-object-injection -- size is a validated prop
        const circleClass = props.circle ? `rounded-full p-0 ${CIRCLE_WIDTHS[size]}` : ''

        // --- Build inner children (icon + text) ---
        const innerChildren: ReturnType<typeof h>[] = []

        if (hasIcon) {
          const iconMargin = props.circle ? '' : isSmall ? '' : hasText ? '-ml-1' : '-ml-1 -mr-1'
          const loadingClass = isLoading ? 'relative overflow-visible [&>*]:invisible' : ''
          const iconChildren = isLoading
            ? // eslint-disable-next-line security/detect-object-injection -- size is a validated prop
              [...(iconContent || []), createSpinner(ICON_SPINNER_SIZE[size], SPINNER_CENTER, true)]
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

        // Spinner for text-only buttons (centered over button)
        const buttonSpinner =
          // eslint-disable-next-line security/detect-object-injection -- size is a validated prop
          isLoading && !hasIcon ? createSpinner(SPINNER_SIZE[size], SPINNER_CENTER, false) : null

        const children = buttonSpinner ? [contentWrapper, buttonSpinner] : [contentWrapper]

        const buttonClass = cn(
          classes.value,
          'relative inline-flex items-center justify-center',
          circleClass,
        )

        // --- Render button ---
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

        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>
        return h(
          'button',
          {
            type: props.type,
            disabled: isDisabled || undefined,
            'data-appearance': props.appearance,
            'aria-busy': isLoading || undefined,
            class: cn(buttonClass, (attrClass as string) || ''),
            ...restAttrs,
          },
          children,
        )
      }
    },
  })
</script>
