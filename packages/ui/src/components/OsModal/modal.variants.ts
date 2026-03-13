import { cva } from 'class-variance-authority'

/**
 * Modal panel classes using CVA (Class Variance Authority)
 */
export const modalPanelVariants = cva([
  'os-modal',
  'relative',
  'bg-white rounded-lg shadow-xl',
  'flex flex-col',
  'w-[90vw] max-w-[500px]',
])
