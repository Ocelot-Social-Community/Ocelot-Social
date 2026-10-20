import { cva } from 'class-variance-authority'

/**
 * Number display variants using CVA (Class Variance Authority)
 *
 * Non-interactive numeric display with optional label and count-up animation.
 */
export const numberVariants = cva(['flex flex-col items-center text-center'], {
  variants: {},
  defaultVariants: {},
})

// No variants yet, so there are no variant props. `VariantProps<typeof numberVariants>` would
// resolve to `{}`, which accepts any non-nullish value instead of none.
export type NumberVariants = Record<string, never>
