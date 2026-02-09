/**
 * Component prop types based on Tailwind CSS scales
 *
 * These types ensure consistency across all components.
 * When a component supports a prop, it must support all values of that scale.
 */

/**
 * Size scale for components (buttons, inputs, avatars, etc.)
 * Maps to Tailwind's text/spacing scale
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
