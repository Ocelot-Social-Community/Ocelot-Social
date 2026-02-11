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
    'inline-flex items-center justify-center align-middle [white-space-collapse:collapse]',
    'relative appearance-none',
    'font-semibold tracking-[0.05em]', // 0.75px at 15px font-size
    'rounded-[4px]',
    'transition-[color,background-color] duration-[80ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
    'cursor-pointer select-none',
    'border-[0.8px] border-solid border-transparent', // consistent border across all appearances
    'focus:outline-1', // outline width, style set per variant
    'disabled:pointer-events-none disabled:cursor-default',
  ],
  {
    variants: {
      variant: {
        // Color variants - actual styling comes from compound variants with appearance
        default: ['focus:outline-dashed focus:outline-current'],
        primary: ['focus:outline-dashed focus:outline-[var(--color-primary)]'],
        secondary: ['focus:outline-dashed focus:outline-[var(--color-secondary)]'],
        danger: ['focus:outline-dashed focus:outline-[var(--color-danger)]'],
        warning: ['focus:outline-dashed focus:outline-[var(--color-warning)]'],
        success: ['focus:outline-dashed focus:outline-[var(--color-success)]'],
        info: ['focus:outline-dashed focus:outline-[var(--color-info)]'],
      },
      appearance: {
        filled: [
          'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]',
          // Disabled: gray background with white text (matches buttonStates mixin)
          // Keep inset shadow to prevent layout shift
          'disabled:bg-[var(--color-disabled)] disabled:text-[var(--color-disabled-contrast)]',
          'disabled:border-[var(--color-disabled)] disabled:shadow-[inset_0_0_0_1px_transparent]',
        ],
        outline: [
          'bg-transparent shadow-none',
          // Disabled: gray border and text
          'disabled:border-[var(--color-disabled)] disabled:text-[var(--color-disabled)]',
        ],
        ghost: [
          'bg-transparent shadow-none',
          // Disabled: gray text
          'disabled:text-[var(--color-disabled)]',
        ],
      },
      size: {
        sm: 'h-[26px] min-w-[26px] px-[8px] py-0 text-[12px] leading-[normal] tracking-[0.6px] rounded-[5px] overflow-hidden whitespace-nowrap align-middle', // base-button --small
        md: 'h-[36px] min-w-[36px] px-[16px] py-0 text-[15px] leading-[normal] rounded-[5px] align-middle',
        lg: 'h-12 min-w-12 px-6 py-3 text-lg',
        xl: 'h-14 min-w-14 px-8 py-4 text-xl',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    compoundVariants: [
      // Filled variants (default appearance)
      {
        variant: 'default',
        appearance: 'filled',
        class: [
          'bg-[var(--color-default)] text-[var(--color-default-contrast)] border-[var(--color-default)]',
          'hover:bg-[var(--color-default-hover)] hover:border-[var(--color-default-hover)]',
          'active:bg-[var(--color-default-active)] active:border-[var(--color-default-active)] active:text-[var(--color-default-contrast-inverse)]',
        ],
      },
      {
        variant: 'primary',
        appearance: 'filled',
        class: [
          'bg-[var(--color-primary)] text-[var(--color-primary-contrast)] border-[var(--color-primary)]',
          'hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)] hover:text-[var(--color-primary-contrast)]',
          'active:bg-[var(--color-primary-active)] active:border-[var(--color-primary-active)] active:text-[var(--color-primary-contrast)]',
        ],
      },
      {
        variant: 'secondary',
        appearance: 'filled',
        class: [
          'bg-[var(--color-secondary)] text-[var(--color-secondary-contrast)] border-[var(--color-secondary)]',
          'hover:bg-[var(--color-secondary-hover)] hover:border-[var(--color-secondary-hover)] hover:text-[var(--color-secondary-contrast)]',
          'active:bg-[var(--color-secondary-active)] active:border-[var(--color-secondary-active)] active:text-[var(--color-secondary-contrast)]',
        ],
      },
      {
        variant: 'danger',
        appearance: 'filled',
        class: [
          'bg-[var(--color-danger)] text-[var(--color-danger-contrast)] border-[var(--color-danger)]',
          'hover:bg-[var(--color-danger-hover)] hover:border-[var(--color-danger-hover)] hover:text-[var(--color-danger-contrast)]',
          'active:bg-[var(--color-danger-active)] active:border-[var(--color-danger-active)] active:text-[var(--color-danger-contrast)]',
        ],
      },
      {
        variant: 'warning',
        appearance: 'filled',
        class: [
          'bg-[var(--color-warning)] text-[var(--color-warning-contrast)] border-[var(--color-warning)]',
          'hover:bg-[var(--color-warning-hover)] hover:border-[var(--color-warning-hover)] hover:text-[var(--color-warning-contrast)]',
          'active:bg-[var(--color-warning-active)] active:border-[var(--color-warning-active)] active:text-[var(--color-warning-contrast)]',
        ],
      },
      {
        variant: 'success',
        appearance: 'filled',
        class: [
          'bg-[var(--color-success)] text-[var(--color-success-contrast)] border-[var(--color-success)]',
          'hover:bg-[var(--color-success-hover)] hover:border-[var(--color-success-hover)] hover:text-[var(--color-success-contrast)]',
          'active:bg-[var(--color-success-active)] active:border-[var(--color-success-active)] active:text-[var(--color-success-contrast)]',
        ],
      },
      {
        variant: 'info',
        appearance: 'filled',
        class: [
          'bg-[var(--color-info)] text-[var(--color-info-contrast)] border-[var(--color-info)]',
          'hover:bg-[var(--color-info-hover)] hover:border-[var(--color-info-hover)] hover:text-[var(--color-info-contrast)]',
          'active:bg-[var(--color-info-active)] active:border-[var(--color-info-active)] active:text-[var(--color-info-contrast)]',
        ],
      },
      // Outline variants
      {
        variant: 'default',
        appearance: 'outline',
        class: [
          'border-[var(--color-default-contrast)] text-[var(--color-default-contrast)]',
          'hover:bg-[var(--color-default-hover)]',
          'active:bg-[var(--color-default-active)] active:text-[var(--color-default-contrast-inverse)]',
        ],
      },
      {
        variant: 'primary',
        appearance: 'outline',
        class: [
          'border-[var(--color-primary)] text-[var(--color-primary)]',
          'hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-contrast)]',
          'active:bg-[var(--color-primary-active)] active:border-[var(--color-primary-active)] active:text-[var(--color-primary-contrast)]',
        ],
      },
      {
        variant: 'secondary',
        appearance: 'outline',
        class: [
          'border-[var(--color-secondary)] text-[var(--color-secondary)]',
          'hover:bg-[var(--color-secondary)] hover:text-[var(--color-secondary-contrast)]',
          'active:bg-[var(--color-secondary-active)] active:border-[var(--color-secondary-active)] active:text-[var(--color-secondary-contrast)]',
        ],
      },
      {
        variant: 'danger',
        appearance: 'outline',
        class: [
          'border-[var(--color-danger)] text-[var(--color-danger)]',
          'hover:bg-[var(--color-danger)] hover:text-[var(--color-danger-contrast)]',
          'active:bg-[var(--color-danger-active)] active:border-[var(--color-danger-active)] active:text-[var(--color-danger-contrast)]',
        ],
      },
      {
        variant: 'warning',
        appearance: 'outline',
        class: [
          'border-[var(--color-warning)] text-[var(--color-warning)]',
          'hover:bg-[var(--color-warning)] hover:text-[var(--color-warning-contrast)]',
          'active:bg-[var(--color-warning-active)] active:border-[var(--color-warning-active)] active:text-[var(--color-warning-contrast)]',
        ],
      },
      {
        variant: 'success',
        appearance: 'outline',
        class: [
          'border-[var(--color-success)] text-[var(--color-success)]',
          'hover:bg-[var(--color-success)] hover:text-[var(--color-success-contrast)]',
          'active:bg-[var(--color-success-active)] active:border-[var(--color-success-active)] active:text-[var(--color-success-contrast)]',
        ],
      },
      {
        variant: 'info',
        appearance: 'outline',
        class: [
          'border-[var(--color-info)] text-[var(--color-info)]',
          'hover:bg-[var(--color-info)] hover:text-[var(--color-info-contrast)]',
          'active:bg-[var(--color-info-active)] active:border-[var(--color-info-active)] active:text-[var(--color-info-contrast)]',
        ],
      },
      // Ghost variants - transparent background, colored text, hover fills, active darkens
      {
        variant: 'default',
        appearance: 'ghost',
        class: [
          'text-[var(--color-default-contrast)]',
          'hover:bg-[var(--color-default-hover)]',
          'active:bg-[var(--color-default-active)] active:text-[var(--color-default-contrast-inverse)]',
        ],
      },
      {
        variant: 'primary',
        appearance: 'ghost',
        class: [
          'text-[var(--color-primary)]',
          'hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-contrast)]',
          'active:bg-[var(--color-primary-active)] active:text-[var(--color-primary-contrast)]',
        ],
      },
      {
        variant: 'secondary',
        appearance: 'ghost',
        class: [
          'text-[var(--color-secondary)]',
          'hover:bg-[var(--color-secondary)] hover:text-[var(--color-secondary-contrast)]',
          'active:bg-[var(--color-secondary-active)] active:text-[var(--color-secondary-contrast)]',
        ],
      },
      {
        variant: 'danger',
        appearance: 'ghost',
        class: [
          'text-[var(--color-danger)]',
          'hover:bg-[var(--color-danger)] hover:text-[var(--color-danger-contrast)]',
          'active:bg-[var(--color-danger-active)] active:text-[var(--color-danger-contrast)]',
        ],
      },
      {
        variant: 'warning',
        appearance: 'ghost',
        class: [
          'text-[var(--color-warning)]',
          'hover:bg-[var(--color-warning)] hover:text-[var(--color-warning-contrast)]',
          'active:bg-[var(--color-warning-active)] active:text-[var(--color-warning-contrast)]',
        ],
      },
      {
        variant: 'success',
        appearance: 'ghost',
        class: [
          'text-[var(--color-success)]',
          'hover:bg-[var(--color-success)] hover:text-[var(--color-success-contrast)]',
          'active:bg-[var(--color-success-active)] active:text-[var(--color-success-contrast)]',
        ],
      },
      {
        variant: 'info',
        appearance: 'ghost',
        class: [
          'text-[var(--color-info)]',
          'hover:bg-[var(--color-info)] hover:text-[var(--color-info-contrast)]',
          'active:bg-[var(--color-info-active)] active:text-[var(--color-info-contrast)]',
        ],
      },
    ],
    defaultVariants: {
      variant: 'default',
      appearance: 'filled',
      size: 'md',
      fullWidth: false,
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
