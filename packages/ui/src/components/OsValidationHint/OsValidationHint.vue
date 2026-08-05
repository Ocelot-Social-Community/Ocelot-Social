<script lang="ts">
  import { computed, defineComponent, h, isVue2 } from 'vue-demi'

  import OsBadge from '#src/components/OsBadge/OsBadge.vue'
  import OsIcon from '#src/components/OsIcon/OsIcon.vue'
  import { ocelotIcons } from '#src/ocelot'
  import { cn } from '#src/utils'

  import type { Component, PropType } from 'vue-demi'

  /**
   * Validation feedback row: optional text message + character counter and/or variant icon badge.
   *
   * @prop variant - 'warning' | 'error' — drives icon, badge color and text color
   * @prop text    - Human-readable feedback message
   * @prop count   - Current character / item count
   * @prop max     - Maximum allowed count; shown as "count / max"
   */
  export default defineComponent({
    name: 'OsValidationHint',
    props: {
      variant: {
        type: String as PropType<'warning' | 'error' | null>,
        default: null,
        validator: (v: string) => v === null || v === 'warning' || v === 'error',
      },
      text: {
        type: String as PropType<string | null>,
        default: null,
      },
      count: {
        type: [Number, String] as PropType<number | string | null>,
        default: null,
      },
      max: {
        type: [Number, String] as PropType<number | string | null>,
        default: null,
      },
    },
    setup(props) {
      const hasCount = computed(() => props.count != null)
      const hasContent = computed(() => !!(props.text || hasCount.value || props.variant))
      const resolvedIcon = computed<Component>(() =>
        props.variant === 'warning' ? ocelotIcons.questionCircle : ocelotIcons.warning,
      )
      const badgeVariant = computed(() => (props.variant === 'error' ? 'danger' : undefined))

      return () => {
        if (!hasContent.value) return null

        const rootClasses = cn(
          'os-validation-hint mt-[4px]',
          props.text ? 'flex items-center justify-between w-full' : 'flex justify-end',
        )

        const textClass = cn(
          'os-validation-hint__text text-[0.75rem] leading-none m-0 flex-1 min-w-0',
          props.variant === 'warning' && 'text-[var(--color-warning)]',
          props.variant === 'error' && 'text-[var(--color-danger)]',
        )

        const badgeStyle =
          props.variant === 'warning'
            ? ({
                '--color-default': 'var(--color-warning)',
                '--color-default-contrast': 'var(--color-warning-contrast)',
              } as Record<string, string>)
            : undefined

        const badgeChildren: ReturnType<typeof h>[] = []

        if (hasCount.value) {
          const countText =
            props.max != null ? `${props.count} / ${props.max}` : String(props.count)
          badgeChildren.push(h('span', {}, countText))
        }

        if (props.variant) {
          /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
          const iconNode = isVue2
            ? h(OsIcon, { props: { icon: resolvedIcon.value } })
            : /* v8 ignore stop */
              h(OsIcon, { icon: resolvedIcon.value })
          badgeChildren.push(iconNode)
        }

        const children: ReturnType<typeof h>[] = []

        if (props.text) {
          children.push(h('p', { class: textClass }, props.text))
        }

        if (hasCount.value || props.variant) {
          /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
          const badgeNode = isVue2
            ? h(
                OsBadge,
                { props: { variant: badgeVariant.value }, style: badgeStyle },
                badgeChildren,
              )
            : /* v8 ignore stop */
              h(
                OsBadge,
                { variant: badgeVariant.value, style: badgeStyle },
                { default: () => badgeChildren },
              )
          children.push(badgeNode)
        }

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          return h(
            'div',
            {
              class: rootClasses,
              attrs: {
                role: props.variant ? 'alert' : null,
                'aria-live': props.variant ? 'assertive' : 'polite',
              },
            },
            children,
          )
        }
        /* v8 ignore stop */

        return h(
          'div',
          {
            class: rootClasses,
            role: props.variant ? 'alert' : undefined,
            'aria-live': props.variant ? 'assertive' : 'polite',
          },
          children,
        )
      }
    },
  })
</script>
