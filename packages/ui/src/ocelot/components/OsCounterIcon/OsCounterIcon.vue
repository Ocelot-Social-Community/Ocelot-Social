<script lang="ts">
  import { computed, defineComponent, h, isVue2 } from 'vue-demi'

  import OsIcon from '#src/components/OsIcon/OsIcon.vue'

  import type { Component, PropType } from 'vue-demi'

  /**
   * Icon with a positioned counter badge.
   * Used for notification counts, comment counts, and similar indicators.
   * The badge appears only when count > 0 and caps at 99+.
   */
  export default defineComponent({
    name: 'OsCounterIcon',
    props: {
      /** Icon component or render function */
      icon: { type: [Object, Function] as PropType<Component>, required: true },
      /** Number to display in the badge */
      count: { type: Number, required: true },
      /** Use danger color for the badge */
      danger: { type: Boolean, default: false },
      /** Use soft/muted color for the badge */
      soft: { type: Boolean, default: false },
    },
    setup(props) {
      const cappedCount = computed(() => (props.count <= 99 ? String(props.count) : '99+'))

      const badgeClass = computed(() => {
        const classes = ['os-counter-icon__count']
        if (props.soft) classes.push('os-counter-icon__count--soft')
        else if (props.danger) classes.push('os-counter-icon__count--danger')
        return classes.join(' ')
      })

      return () => {
        const icon = h(
          OsIcon,
          /* v8 ignore next -- Vue 2 */ isVue2
            ? { props: { icon: props.icon } }
            : { icon: props.icon },
        )

        const children = [icon]

        if (props.count > 0) {
          children.push(
            h(
              'span',
              { class: badgeClass.value },
              /* v8 ignore next -- Vue 2 */ isVue2 ? [cappedCount.value] : cappedCount.value,
            ),
          )
        }

        return h('span', { class: 'os-counter-icon' }, children)
      }
    },
  })
</script>

<style>
  .os-counter-icon {
    position: relative;
    display: inline-flex;
  }

  .os-counter-icon__count {
    position: absolute;
    top: -4px;
    right: 0;
    transform: translateX(50%);

    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 16px;
    min-width: 16px;
    padding: 3px;
    border-radius: 50%;

    color: var(--os-counter-icon-color, var(--color-primary-contrast));
    background-color: var(--os-counter-icon-bg, var(--color-primary));
    font-size: 10px;
    line-height: 1;
    text-align: center;
  }

  .os-counter-icon__count--danger {
    background-color: var(--os-counter-icon-danger-bg, var(--color-danger));
  }

  .os-counter-icon__count--soft {
    background-color: var(--os-counter-icon-soft-bg, var(--color-default));
    color: var(--os-counter-icon-soft-color, var(--color-text-soft));
  }
</style>
