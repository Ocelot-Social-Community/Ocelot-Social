/**
 * @ocelot-social/ui
 *
 * Vue component library for ocelot.social
 * Works with Vue 2.7+ and Vue 3
 *
 * Note: CSS is built separately - import '@ocelot-social/ui/style.css' in your app
 */

// Re-export all components
export * from './components'

// Export Vue plugin for global registration
export { default as OcelotUI } from './plugin'

// Export utilities
export { cn } from './utils'

// Export prop types
export type { Size, Rounded, Shadow, Variant } from './types'
