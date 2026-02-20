import { cva } from 'class-variance-authority'

import type { VariantProps } from 'class-variance-authority'

/**
 * Number display variants using CVA (Class Variance Authority)
 *
 * Non-interactive numeric display with optional label and count-up animation.
 */
export const numberVariants = cva(['flex flex-col items-center text-center'], {
  variants: {},
  defaultVariants: {},
})

export type NumberVariants = VariantProps<typeof numberVariants>
