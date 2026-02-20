import { cva } from 'class-variance-authority'

import type { VariantProps } from 'class-variance-authority'

/**
 * Badge variants using CVA (Class Variance Authority)
 *
 * Non-interactive label for metadata display and form counters.
 * Renders as a pill-shaped inline element.
 */
export const badgeVariants = cva(
  // Base classes (always applied) - pill shape matching ds-chip round=true
  ['inline-flex items-center gap-[0.25em] font-semibold leading-[1.3] rounded-[2em]'],
  {
    variants: {
      variant: {
        default: 'text-[var(--color-default-contrast)] bg-[var(--color-default)]',
        primary: 'text-[var(--color-primary-contrast)] bg-[var(--color-primary)]',
        danger: 'text-[var(--color-danger-contrast)] bg-[var(--color-danger)]',
      },
      size: {
        sm: 'text-[0.75rem] py-[0.2em] px-[0.8em]',
        base: 'text-[0.8rem] py-[0.1em] px-[1em]',
        lg: 'text-[1rem] py-[0.15em] px-[1.2em]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>

/** Badge-specific size subset: sm | base | lg */
export type BadgeSize = NonNullable<BadgeVariants['size']>
