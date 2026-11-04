import { cva } from 'class-variance-authority'

import type { VariantProps } from 'class-variance-authority'

/**
 * Badge variants using CVA (Class Variance Authority)
 *
 * Non-interactive label for metadata display and form counters.
 */
export const badgeVariants = cva(
  ['inline-flex w-fit items-center gap-[0.25em] font-semibold leading-[1.3]'],
  {
    variants: {
      variant: {
        default: 'text-[var(--color-default-contrast)] bg-[var(--color-default)]',
        primary: 'text-[var(--color-primary-contrast)] bg-[var(--color-primary)]',
        danger: 'text-[var(--color-danger-contrast)] bg-[var(--color-danger)]',
      },
      size: {
        sm: 'text-[0.75rem] py-[0.2em] px-[0.8em]',
        md: 'text-[0.875rem] py-[0.15em] px-[1em]',
        lg: 'text-[1rem] py-[0.15em] px-[1.2em]',
      },
      shape: {
        pill: 'rounded-[2em]',
        square: 'rounded-[0.25em]',
      },
      /**
       * A count instead of words: as wide as it is high around one digit, wider with more,
       * and never squeezed in a narrow row. After size, so its padding and height win over
       * the size's.
       */
      count: {
        true: 'shrink-0 justify-center box-border min-w-[1.7em] h-[1.7em] px-[0.45em] py-0 leading-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      shape: 'pill',
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>

/** Badge color variant: default | primary | danger */
export type BadgeVariant = NonNullable<BadgeVariants['variant']>

/** Badge-specific size subset: sm | md | lg */
export type BadgeSize = NonNullable<BadgeVariants['size']>

/** Badge shape: pill | square */
export type BadgeShape = NonNullable<BadgeVariants['shape']>
