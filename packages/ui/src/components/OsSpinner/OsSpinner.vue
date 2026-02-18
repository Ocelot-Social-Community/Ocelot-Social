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

          return h(
            'span',
            {
              class: cn('os-spinner inline-flex shrink-0', sizeClass, parentClass, parentDynClass),
              attrs: {
                role: 'status',
                'aria-label': parentAttrs['aria-label'] || attrs['aria-label'] || 'Loading',
                ...parentAttrs,
                ...attrs,
              },
            },
            [svg],
          )
        }
        /* v8 ignore stop */

        const {
          class: attrClass,
          'aria-label': ariaLabel,
          ...restAttrs
        } = attrs as Record<string, unknown>

        return h(
          'span',
          {
            class: cn('os-spinner inline-flex shrink-0', sizeClass, attrClass as ClassValue),
            role: 'status',
            'aria-label': ariaLabel || 'Loading',
            ...restAttrs,
          },
          [svg],
        )
      }
    },
  })
</script>
