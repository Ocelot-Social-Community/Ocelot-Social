<script lang="ts">
  import { defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '#src/utils'
  import { badgeVariants } from './badge.variants'

  import type { ClassValue } from 'clsx'
  import type { PropType } from 'vue-demi'
  import type { BadgeSize, BadgeVariants } from './badge.variants'

  /**
   * Non-interactive label for metadata display (e.g. group info) and
   * form counters (e.g. character count with validation state).
   *
   * Renders as a pill-shaped `<span>`.
   *
   * @slot default - Badge content (text, icons)
   */
  export default defineComponent({
    name: 'OsBadge',
    inheritAttrs: false,
    props: {
      /**
       * Visual style of the badge.
       * - `default` — neutral gray background
       * - `primary` — brand color (green)
       * - `danger` — error/warning color (red)
       */
      variant: {
        type: String as PropType<NonNullable<BadgeVariants['variant']>>,
        default: undefined,
      },
      /**
       * Size of the badge.
       * - `sm` — compact (default)
       * - `base` — medium, used for form counters
       * - `lg` — large
       */
      size: {
        type: String as PropType<BadgeSize>,
        default: undefined,
      },
    },
    setup(props, { slots, attrs }) {
      /* v8 ignore start -- Vue 2 only */
      const instance = isVue2 ? getCurrentInstance() : null
      /* v8 ignore stop */

      return () => {
        const children = slots.default?.()
        const badgeClass = cn('os-badge', badgeVariants({ variant: props.variant, size: props.size }))

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
              class: cn(badgeClass, parentClass, parentDynClass),
              attrs: { ...parentAttrs, ...attrs },
            },
            children,
          )
        }
        /* v8 ignore stop */

        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>

        return h(
          'span',
          {
            class: cn(badgeClass, attrClass as ClassValue),
            ...restAttrs,
          },
          children,
        )
      }
    },
  })
</script>
