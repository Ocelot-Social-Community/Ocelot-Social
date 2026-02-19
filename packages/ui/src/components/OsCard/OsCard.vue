<script lang="ts">
  import { defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '#src/utils'

  import type { ClassValue } from 'clsx'

  const CARD_CLASS =
    'os-card relative p-6 rounded-[5px] overflow-hidden break-words bg-white shadow-[0px_12px_26px_-4px_rgba(0,0,0,0.1)]'

  /**
   * Content card container with rounded corners, background, and shadow.
   * Renders as `<article>` by default.
   *
   * @slot default - Card content
   */
  export default defineComponent({
    name: 'OsCard',
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      /* v8 ignore start -- Vue 2 only */
      const instance = isVue2 ? getCurrentInstance() : null
      /* v8 ignore stop */

      return () => {
        const children = slots.default?.()

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class
          const parentAttrs = proxy?.$vnode?.data?.attrs || {}

          return h(
            'article',
            {
              class: cn(CARD_CLASS, parentClass, parentDynClass),
              attrs: { ...parentAttrs, ...attrs },
            },
            children,
          )
        }
        /* v8 ignore stop */

        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>

        return h(
          'article',
          {
            class: cn(CARD_CLASS, attrClass as ClassValue),
            ...restAttrs,
          },
          children,
        )
      }
    },
  })
</script>
