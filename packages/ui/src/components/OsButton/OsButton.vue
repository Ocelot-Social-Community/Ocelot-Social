<script lang="ts">
  import { computed, defineComponent, getCurrentInstance, h, isVue2 } from 'vue-demi'

  import { cn } from '../../utils'

  import { buttonVariants } from './button.variants'

  import type { ButtonVariants } from './button.variants'
  import type { PropType } from 'vue-demi'

  export default defineComponent({
    name: 'OsButton',
    // In Vue 2, inheritAttrs must be false to manually forward attrs
    inheritAttrs: false,
    props: {
      variant: {
        type: String as PropType<ButtonVariants['variant']>,
        default: 'default',
      },
      appearance: {
        type: String as PropType<ButtonVariants['appearance']>,
        default: 'filled',
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
    setup(props, { slots, attrs }) {
      const classes = computed(() =>
        cn(
          buttonVariants({
            variant: props.variant,
            appearance: props.appearance,
            size: props.size,
            fullWidth: props.fullWidth,
          }),
          props.customClass,
        ),
      )

      // Get component instance for Vue 2 $listeners access
      const instance = getCurrentInstance()

      return () => {
        const children = slots.default?.()
        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // Vue 2: separate attrs and on (listeners)
          // $listeners contains event handlers like @click
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const listeners = proxy?.$listeners || {}
          // In Vue 2, class/style are not in $attrs - access via $vnode
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class

          return h(
            'button',
            {
              class: [classes.value, parentClass, parentDynClass].filter(Boolean),
              attrs: {
                type: props.type,
                disabled: props.disabled || undefined,
                'data-appearance': props.appearance,
                ...attrs,
              },
              on: listeners,
            },
            children,
          )
        }
        /* v8 ignore stop */
        // Vue 3: flat props, attrs includes listeners
        // Extract class from attrs to merge instead of overwrite
        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>
        return h(
          'button',
          {
            type: props.type,
            disabled: props.disabled,
            'data-appearance': props.appearance,
            class: cn(classes.value, (attrClass as string) || ''),
            ...restAttrs,
          },
          children,
        )
      }
    },
  })
</script>
