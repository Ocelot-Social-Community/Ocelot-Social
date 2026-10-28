import { cva } from 'class-variance-authority'

import type { VariantProps } from 'class-variance-authority'

/**
 * Drawer panel variants using CVA (Class Variance Authority)
 *
 * A full-height panel at a screen edge. Closed, it waits outside the viewport and invisible —
 * out of reach of the focus and of assistive technology — so it can slide in and out.
 */
export const drawerPanelVariants = cva(
  [
    'os-drawer',
    'fixed top-0 bottom-0 z-[9999]',
    'flex flex-col w-[min(320px,85vw)]',
    'bg-white shadow-xl overflow-y-auto outline-none',
    'transition-[transform,visibility] duration-200 ease-out motion-reduce:transition-none',
  ],
  {
    variants: {
      side: {
        left: ['left-0', '-translate-x-full'],
        right: ['right-0', 'translate-x-full'],
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
)

export type DrawerVariants = VariantProps<typeof drawerPanelVariants>

/** The screen edge the drawer opens at: left | right */
export type DrawerSide = NonNullable<DrawerVariants['side']>
