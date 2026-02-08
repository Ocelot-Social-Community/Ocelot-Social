<script setup lang="ts">
  import { computed } from 'vue-demi'

  import { cn } from '../../utils'

  import { buttonVariants } from './button.variants'

  import type { ButtonVariants } from './button.variants'

  export interface OsButtonProps {
    /** Visual style variant */
    variant?: ButtonVariants['variant']
    /** Size of the button */
    size?: ButtonVariants['size']
    /** Whether button takes full width of container */
    fullWidth?: boolean
    /** HTML button type attribute */
    type?: 'button' | 'submit' | 'reset'
    /** Whether the button is disabled */
    disabled?: boolean
    /** Additional CSS classes */
    class?: string
  }

  const props = withDefaults(defineProps<OsButtonProps>(), {
    variant: 'primary',
    size: 'md',
    fullWidth: false,
    type: 'button',
    disabled: false,
    class: '',
  })

  const classes = computed(() =>
    cn(
      buttonVariants({
        variant: props.variant,
        size: props.size,
        fullWidth: props.fullWidth,
      }),
      props.class,
    ),
  )
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
