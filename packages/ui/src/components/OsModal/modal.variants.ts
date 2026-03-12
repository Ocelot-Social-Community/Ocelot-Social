import { cva } from 'class-variance-authority'

import type { VariantProps } from 'class-variance-authority'

/**
 * Modal panel variants using CVA (Class Variance Authority)
 *
 * Controls the width of the modal panel based on the `size` prop.
 */
export const modalPanelVariants = cva(
  [
    'os-modal',
    'relative',
    'bg-white rounded-lg shadow-xl',
    'flex flex-col',
    'w-[90vw]',
  ],
  {
    variants: {
      size: {
        default: 'max-w-[500px]',
        extended: 'max-w-[800px]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

export type ModalVariants = VariantProps<typeof modalPanelVariants>

/** Modal size: default | extended */
export type ModalSize = NonNullable<ModalVariants['size']>
