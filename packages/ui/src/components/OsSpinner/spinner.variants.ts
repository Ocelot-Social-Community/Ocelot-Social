import type { Size } from '#src/types'

/**
 * Spinner size classes (em-based, scales with parent font-size)
 */
export const SPINNER_SIZES: Record<Size, string> = {
  xs: 'h-[0.75em] w-[0.75em]',
  sm: 'h-[1em] w-[1em]',
  md: 'h-[1.5em] w-[1.5em]',
  lg: 'h-[2em] w-[2em]',
  xl: 'h-[2.5em] w-[2.5em]',
  '2xl': 'h-[3em] w-[3em]',
}
