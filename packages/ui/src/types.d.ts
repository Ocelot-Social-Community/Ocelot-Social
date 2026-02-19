/**
 * Shared vocabulary types for component props.
 *
 * These types define a common naming convention across components.
 * Components pick the subset that makes sense for them:
 * - OsIcon/OsSpinner: all 6 sizes (inline elements, em-based)
 * - OsButton: sm–xl (interactive element, pixel-based touch targets)
 */

/**
 * Size vocabulary shared across components.
 * Each component supports the subset that makes sense for its context.
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/**
 * Border radius scale
 * Maps to Tailwind's rounded-* utilities
 */
export type Rounded = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'

/**
 * Box shadow scale
 * Maps to Tailwind's shadow-* utilities
 */
export type Shadow = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/**
 * Semantic color variants for interactive components
 */
export type Variant = 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info'
