<script lang="ts">
  import { defineComponent, h, isVue2 } from 'vue-demi'

  import OsButton from '#src/components/OsButton/OsButton.vue'
  import OsIcon from '#src/components/OsIcon/OsIcon.vue'

  import type { ButtonSize, ButtonVariants } from '#src/components/OsButton/button.variants'
  import type { Component, PropType } from 'vue-demi'

  // The count badge scales with the button — at 'sm' (26px) a fixed 25px badge would be nearly
  // as big as the button itself. top/left/font-size are derived from this via CSS calc() (see
  // <style> below), matching the proportions the original fixed 25px/12px/-12px/-16px used at 'md'.
  const BADGE_DIAMETER: Record<ButtonSize, number> = { sm: 18, md: 25, lg: 32, xl: 38 }

  /**
   * Circular icon button with a count badge.
   * Used for actions like "shout" or "observe" where a count is displayed.
   *
   * @slot icon - Custom icon content (overrides the `icon` prop)
   */
  export default defineComponent({
    name: 'OsActionButton',
    props: {
      /** Number displayed in the badge */
      count: { type: Number, required: true },
      /** Accessible label for screen readers (icon-only button) */
      ariaLabel: { type: String, required: true },
      /** Icon component or render function */
      icon: { type: [Object, Function] as PropType<Component>, required: true },
      /** Button size, same scale as OsButton's own `size` prop */
      size: { type: String as PropType<ButtonVariants['size']>, default: 'md' },
      /** Whether the button appears filled (active state) */
      filled: { type: Boolean, default: false },
      /** Disables the button */
      disabled: { type: Boolean, default: false },
      /** Shows loading spinner */
      loading: { type: Boolean, default: false },
    },
    emits: ['click'],
    setup(props, { slots, emit }) {
      return () => {
        const iconSlot = slots.icon?.() || [
          h(
            OsIcon,
            /* v8 ignore next -- Vue 2 */ isVue2
              ? { props: { icon: props.icon } }
              : { icon: props.icon },
          ),
        ]

        const button = h(
          OsButton,
          /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
          isVue2
            ? {
                props: {
                  variant: 'primary',
                  appearance: props.filled ? 'filled' : 'outline',
                  size: props.size,
                  loading: props.loading,
                  disabled: props.disabled,
                  circle: true,
                },
                attrs: { 'aria-label': props.ariaLabel },
                on: { click: () => emit('click') },
              }
            : /* v8 ignore stop */ {
                variant: 'primary',
                appearance: props.filled ? 'filled' : 'outline',
                size: props.size,
                loading: props.loading,
                disabled: props.disabled,
                circle: true,
                'aria-label': props.ariaLabel,
                onClick: () => emit('click'),
              },
          /* v8 ignore next -- Vue 2 */ isVue2 ? iconSlot : { icon: () => iconSlot },
        )

        const badge = h(
          'div',
          {
            class: 'os-action-button__count',
            style: {
              '--os-action-button-badge-diameter': `${BADGE_DIAMETER[props.size as ButtonSize]}px`,
            },
            'aria-hidden': 'true',
          },
          /* v8 ignore next -- Vue 2 */ isVue2 ? [String(props.count)] : String(props.count),
        )

        return h('div', { class: 'os-action-button' }, [button, badge])
      }
    },
  })
</script>

<style>
  .os-action-button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  .os-action-button__count {
    /* Overridden inline per size (see BADGE_DIAMETER) — this default only covers usage
       outside OsActionButton's own render, if any. */
    --os-action-button-badge-diameter: 25px;
    user-select: none;
    color: var(--os-action-button-color, var(--color-primary));
    background-color: var(--os-action-button-bg, var(--color-primary-contrast));
    border: 1px solid var(--os-action-button-color, var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: calc(-1 * var(--os-action-button-badge-diameter) / 2);
    left: calc(100% - var(--os-action-button-badge-diameter) + 9px);
    min-width: var(--os-action-button-badge-diameter);
    height: var(--os-action-button-badge-diameter);
    border-radius: calc(var(--os-action-button-badge-diameter) / 2);
    font-size: calc(var(--os-action-button-badge-diameter) * 0.48);
    padding-inline: 2px;
  }
</style>
