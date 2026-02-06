/**
 * @ocelot-social/ui
 *
 * Vue component library for ocelot.social
 * Works with Vue 2.7+ and Vue 3
 */

// Import styles (extracted to style.css during build)
import './styles/index.css'

// Re-export all components
export type * from './components'

// Export Vue plugin for global registration
export { default as OcelotUI } from './plugin'

// Export prop types
export type { Size, Rounded, Shadow, Variant } from './types'
