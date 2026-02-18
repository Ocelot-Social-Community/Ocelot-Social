<script lang="ts">
  import { defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '#src/utils'

  import { createSpinnerSvg } from './createSpinnerSvg'
  import { SPINNER_SIZES } from './spinner.variants'

  import type { Size } from '#src/types'
  import type { ClassValue } from 'clsx'
  import type { PropType } from 'vue-demi'

  /**
   * Animated loading spinner with configurable size.
   * Inherits color from parent via `currentColor`.
   *
   * Semantic by default (`role="status"`, `aria-label="Loading"`).
   * Pass `aria-hidden="true"` to make it decorative (suppresses role/aria-label).
   *
   * @prop size - Spinner size (xs/sm/md/lg/xl/2xl)
   */
  export default defineComponent({
    name: 'OsSpinner',
    inheritAttrs: false,
    props: {
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
        const sizeClass = SPINNER_SIZES[props.size]
        const svg = createSpinnerSvg()

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class
          const parentAttrs = proxy?.$vnode?.data?.attrs || {}

          const isDecorative =
            parentAttrs['aria-hidden'] === 'true' || attrs['aria-hidden'] === 'true'
          const a11yAttrs = isDecorative
            ? { 'aria-hidden': 'true' }
            : {
                role: 'status',
                'aria-label': parentAttrs['aria-label'] || attrs['aria-label'] || 'Loading',
              }

          return h(
            'span',
            {
              class: cn('os-spinner inline-flex shrink-0', sizeClass, parentClass, parentDynClass),
              attrs: { ...a11yAttrs, ...parentAttrs, ...attrs, ...a11yAttrs },
            },
            [svg],
          )
        }
        /* v8 ignore stop */

        const {
          class: attrClass,
          'aria-label': ariaLabel,
          'aria-hidden': ariaHidden,
          ...restAttrs
        } = attrs as Record<string, unknown>

        const isDecorative = ariaHidden === 'true'
        const a11yAttrs = isDecorative
          ? { 'aria-hidden': 'true' as const }
          : { role: 'status' as const, 'aria-label': (ariaLabel as string) || 'Loading' }

        return h(
          'span',
          {
            class: cn('os-spinner inline-flex shrink-0', sizeClass, attrClass as ClassValue),
            ...a11yAttrs,
            ...restAttrs,
          },
          [svg],
        )
      }
    },
  })
</script>
