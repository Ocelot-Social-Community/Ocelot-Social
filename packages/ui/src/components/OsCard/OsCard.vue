<script lang="ts">
  import { defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '#src/utils'

  import type { ClassValue } from 'clsx'
  import type { PropType } from 'vue-demi'

  const CARD_BASE =
    'os-card relative rounded-[5px] overflow-hidden break-words bg-white shadow-[0px_12px_26px_-4px_rgba(0,0,0,0.1)]'

  const HIGHLIGHT_CLASS = 'border border-[var(--color-warning)]'

  const HERO_IMAGE_CLASS = 'os-card__hero-image'
  const CONTENT_CLASS = 'os-card__content p-6'

  /**
   * Content card container with rounded corners, background, and shadow.
   * Renders as `<div>` by default. Use `as="article"` for self-contained
   * content like posts or comments.
   *
   * When `heroImage` slot is provided, the card uses a two-section layout:
   * the hero image spans full width (no padding), followed by padded content.
   * Without `heroImage`, the card applies padding directly.
   *
   * @slot default - Card content
   * @slot heroImage - Full-width image at the top of the card
   */
  export default defineComponent({
    name: 'OsCard',
    inheritAttrs: false,
    props: {
      /**
       * HTML element to render as. Use `article` for self-contained content
       * (posts, comments), `section` for thematic groups, or `div` (default)
       * for generic containers.
       */
      as: {
        type: String as PropType<'div' | 'article' | 'section' | 'aside'>,
        default: 'div',
      },
      /**
       * Adds a colored border to highlight the card (e.g. for pinned posts).
       * Uses `--color-warning` CSS variable for border color.
       */
      highlight: {
        type: Boolean,
        default: false,
      },
    },
    setup(props, { slots, attrs }) {
      /* v8 ignore start -- Vue 2 only */
      const instance = isVue2 ? getCurrentInstance() : null
      /* v8 ignore stop */

      return () => {
        const defaultContent = slots.default?.()
        const heroImageContent = slots.heroImage?.()
        const hasHeroImage = heroImageContent && heroImageContent.length > 0

        const cardClass = cn(CARD_BASE, !hasHeroImage && 'p-6', props.highlight && HIGHLIGHT_CLASS)

        const children = hasHeroImage
          ? [
              h('div', { class: HERO_IMAGE_CLASS }, heroImageContent),
              h('div', { class: CONTENT_CLASS }, defaultContent),
            ]
          : defaultContent

        const tag = props.as

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class
          const parentAttrs = proxy?.$vnode?.data?.attrs || {}

          return h(
            tag,
            {
              class: cn(cardClass, parentClass, parentDynClass),
              attrs: { ...parentAttrs, ...attrs },
            },
            children,
          )
        }
        /* v8 ignore stop */

        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>

        return h(
          tag,
          {
            class: cn(cardClass, attrClass as ClassValue),
            ...restAttrs,
          },
          children,
        )
      }
    },
  })
</script>
