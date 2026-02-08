<script lang="ts">
  import { computed, defineComponent, h, isVue2 } from 'vue-demi'

  import { cn } from '../../utils'

  import { buttonVariants } from './button.variants'

  import type { ButtonVariants } from './button.variants'
  import type { PropType } from 'vue-demi'

  export default defineComponent({
    name: 'OsButton',
    props: {
      variant: {
        type: String as PropType<ButtonVariants['variant']>,
        default: 'primary',
      },
      size: {
        type: String as PropType<ButtonVariants['size']>,
        default: 'md',
      },
      fullWidth: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String as PropType<'button' | 'submit' | 'reset'>,
        default: 'button',
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      customClass: {
        type: String,
        default: '',
      },
    },
    setup(props, { slots }) {
      const classes = computed(() =>
        cn(
          buttonVariants({
            variant: props.variant,
            size: props.size,
            fullWidth: props.fullWidth,
          }),
          props.customClass,
        ),
      )

      return () => {
        const children = slots.default?.()
        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // Vue 2: attrs for HTML attributes
          return h(
            'button',
            {
              class: classes.value,
              attrs: {
                type: props.type,
                disabled: props.disabled || undefined,
              },
            },
            children,
          )
        }
        /* v8 ignore stop */
        // Vue 3: flat props
        return h(
          'button',
          {
            type: props.type,
            disabled: props.disabled,
            class: classes.value,
          },
          children,
        )
      }
    },
  })
</script>
