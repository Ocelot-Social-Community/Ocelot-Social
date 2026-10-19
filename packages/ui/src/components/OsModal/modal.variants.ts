import { cva } from 'class-variance-authority'

import type { VariantProps } from 'class-variance-authority'

/**
 * Modal panel classes using CVA (Class Variance Authority)
 *
 * `size` caps the panel width; below that cap the panel takes 90% of the viewport.
 */
export const modalPanelVariants = cva(
  [
    'os-modal',
    'relative',
    'bg-white rounded-lg shadow-xl',
    'flex flex-col',
    'w-[90vw]',
    // The panel itself receives focus on open when nothing inside asks for it
    'focus:outline-none',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-[400px]',
        md: 'max-w-[500px]',
        lg: 'max-w-[700px]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
)

export type ModalPanelVariants = VariantProps<typeof modalPanelVariants>

/** Modal panel size: sm | md | lg */
export type ModalSize = NonNullable<ModalPanelVariants['size']>
