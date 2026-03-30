<script lang="ts">
  import { defineComponent, h, isVue2 } from 'vue-demi'

  import OsButton from '#src/components/OsButton/OsButton.vue'
  import OsIcon from '#src/components/OsIcon/OsIcon.vue'

  import type { Component, PropType } from 'vue-demi'

  /**
   * Circular button with a label below it.
   * Used for filter toggles and categorized actions.
   *
   * @slot icon - Custom icon content (overrides the `icon` prop)
   */
  export default defineComponent({
    name: 'OsLabeledButton',
    props: {
      /** Icon component or render function */
      icon: { type: [Object, Function] as PropType<Component>, required: true },
      /** Text label displayed below the button */
      label: { type: String, required: true },
      /** Whether the button appears filled (active state) */
      filled: { type: Boolean, default: false },
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
                  circle: true,
                },
                attrs: { 'aria-label': props.label },
                on: { click: (e: Event) => emit('click', e) },
              }
            : /* v8 ignore stop */ {
                variant: 'primary',
                appearance: props.filled ? 'filled' : 'outline',
                circle: true,
                'aria-label': props.label,
                onClick: (e: Event) => emit('click', e),
              },
          /* v8 ignore next -- Vue 2 */ isVue2 ? iconSlot : { icon: () => iconSlot },
        )

        const label = h(
          'span',
          { class: 'os-labeled-button__label' },
          /* v8 ignore next -- Vue 2 */ isVue2 ? [props.label] : props.label,
        )

        return h('div', { class: 'os-labeled-button' }, [button, label])
      }
    },
  })
</script>

<style>
  .os-labeled-button {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .os-labeled-button__label {
    margin-top: 8px;
    font-size: 0.875rem;
    text-align: center;
  }
</style>
