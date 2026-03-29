<script lang="ts">
  import { defineComponent, h, isVue2 } from 'vue-demi'

  import OsButton from '#src/components/OsButton/OsButton.vue'
  import OsIcon from '#src/components/OsIcon/OsIcon.vue'

  import type { Component, PropType } from 'vue-demi'

  /**
   * Circular icon button with a count badge.
   * Used for actions like "shout" or "observe" where a count is displayed.
   *
   * @slot icon - Custom icon content (overrides the `icon` prop)
   */
  export default defineComponent({
    name: 'OcelotActionButton',
    emits: ['click'],
    props: {
      /** Number displayed in the badge */
      count: { type: Number, required: true },
      /** Accessible label for screen readers (icon-only button) */
      ariaLabel: { type: String, required: true },
      /** Icon component or render function */
      icon: { type: [Object, Function] as PropType<Component>, required: true },
      /** Whether the button appears filled (active state) */
      filled: { type: Boolean, default: false },
      /** Disables the button */
      disabled: { type: Boolean, default: false },
      /** Shows loading spinner */
      loading: { type: Boolean, default: false },
    },
    setup(props, { slots, emit }) {
      return () => {
        const iconSlot = slots.icon?.() || [
          h(OsIcon, isVue2 ? { props: { icon: props.icon } } : { icon: props.icon }),
        ]

        const button = h(
          OsButton,
          isVue2
            ? {
                props: {
                  variant: 'primary',
                  appearance: props.filled ? 'filled' : 'outline',
                  loading: props.loading,
                  disabled: props.disabled,
                  circle: true,
                },
                attrs: { 'aria-label': props.ariaLabel },
                on: { click: () => emit('click') },
              }
            : {
                variant: 'primary',
                appearance: props.filled ? 'filled' : 'outline',
                loading: props.loading,
                disabled: props.disabled,
                circle: true,
                'aria-label': props.ariaLabel,
                onClick: () => emit('click'),
              },
          isVue2 ? iconSlot : { icon: () => iconSlot },
        )

        const badge = h(
          'div',
          { class: 'ocelot-action-button__count' },
          isVue2 ? [String(props.count)] : String(props.count),
        )

        return h('div', { class: 'ocelot-action-button' }, [button, badge])
      }
    },
  })
</script>

<style>
  .ocelot-action-button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  .ocelot-action-button__count {
    user-select: none;
    color: var(--ocelot-action-button-color, var(--color-primary));
    background-color: var(--ocelot-action-button-bg, var(--color-primary-contrast));
    border: 1px solid var(--ocelot-action-button-color, var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: -12px;
    left: calc(100% - 16px);
    min-width: 25px;
    height: 25px;
    border-radius: 12px;
    font-size: 12px;
    padding-inline: 2px;
  }
</style>
