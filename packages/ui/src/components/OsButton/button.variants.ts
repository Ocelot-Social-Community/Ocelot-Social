import { cva } from 'class-variance-authority'

import type { VariantProps } from 'class-variance-authority'

/**
 * Button variants using CVA (Class Variance Authority)
 *
 * This pattern allows:
 * - Type-safe variant props
 * - Composable class combinations
 * - Easy customization via class prop
 */
export const buttonVariants = cva(
  // Base classes (always applied) - matching ds-button styles
  [
    'inline-flex items-center justify-center',
    'font-semibold tracking-wide',
    'rounded',
    'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]',
    'transition-colors duration-100 ease-out',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--color-primary)] text-[var(--color-primary-contrast)]',
          'hover:bg-[var(--color-primary-hover)]',
          'focus-visible:ring-[var(--color-primary)]',
        ],
        secondary: [
          'bg-[var(--color-secondary)] text-[var(--color-secondary-contrast)]',
          'hover:bg-[var(--color-secondary-hover)]',
          'focus-visible:ring-[var(--color-secondary)]',
        ],
        danger: [
          'bg-[var(--color-danger)] text-[var(--color-danger-contrast)]',
          'hover:bg-[var(--color-danger-hover)]',
          'focus-visible:ring-[var(--color-danger)]',
        ],
        warning: [
          'bg-[var(--color-warning)] text-[var(--color-warning-contrast)]',
          'hover:bg-[var(--color-warning-hover)]',
          'focus-visible:ring-[var(--color-warning)]',
        ],
        success: [
          'bg-[var(--color-success)] text-[var(--color-success-contrast)]',
          'hover:bg-[var(--color-success-hover)]',
          'focus-visible:ring-[var(--color-success)]',
        ],
        info: [
          'bg-[var(--color-info)] text-[var(--color-info-contrast)]',
          'hover:bg-[var(--color-info-hover)]',
          'focus-visible:ring-[var(--color-info)]',
        ],
        ghost: ['bg-transparent shadow-none', 'hover:bg-gray-100', 'focus-visible:ring-gray-400'],
        outline: [
          'border border-current bg-transparent shadow-none',
          'hover:bg-gray-100',
          'focus-visible:ring-gray-400',
        ],
      },
      size: {
        xs: 'h-6 px-2 py-1 text-xs',
        sm: 'h-8 px-3 py-1.5 text-sm',
        md: 'h-[37.5px] px-4 py-2 text-[15px]',
        lg: 'h-12 px-6 py-3 text-lg',
        xl: 'h-14 px-8 py-4 text-xl',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
