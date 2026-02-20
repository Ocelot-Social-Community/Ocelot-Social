<script lang="ts">
  import { defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '#src/utils'

  import { badgeVariants } from './badge.variants'

  import type { BadgeShape, BadgeSize, BadgeVariant } from './badge.variants'
  import type { ClassValue } from 'clsx'
  import type { PropType } from 'vue-demi'

  /**
   * Non-interactive label for metadata display (e.g. group info) and
   * form counters (e.g. character count with validation state).
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
        type: String as PropType<BadgeVariant>,
        default: undefined,
      },
      /**
       * Size of the badge.
       * - `sm` — compact (default)
       * - `md` — medium
       * - `lg` — large
       */
      size: {
        type: String as PropType<BadgeSize>,
        default: undefined,
      },
      /**
       * Shape of the badge.
       * - `pill` — fully rounded (default)
       * - `square` — slightly rounded corners
       */
      shape: {
        type: String as PropType<BadgeShape>,
        default: undefined,
      },
    },
    setup(props, { slots, attrs }) {
      /* v8 ignore start -- Vue 2 only */
      const instance = isVue2 ? getCurrentInstance() : null
      /* v8 ignore stop */

      return () => {
        const children = slots.default?.()
        const badgeClass = cn(
          'os-badge',
          badgeVariants({ variant: props.variant, size: props.size, shape: props.shape }),
        )

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
