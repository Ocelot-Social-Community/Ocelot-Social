import { cva } from 'class-variance-authority'

import type { VariantProps } from 'class-variance-authority'

export const menuItemVariants = cva(
  // Base classes for menu item link
  [
    'os-menu-item-link',
    'block no-underline',
    'transition-colors duration-[80ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
  ],
  {
    variants: {
      level: {
        0: '',
        1: 'text-sm',
        2: 'text-sm',
      },
    },
    defaultVariants: {
      level: 0,
    },
  },
)

export type MenuItemVariants = VariantProps<typeof menuItemVariants>
