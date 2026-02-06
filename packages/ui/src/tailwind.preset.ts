/**
 * Tailwind CSS Preset for @ocelot-social/ui
 *
 * This preset defines CSS Custom Properties used by components.
 * The library does NOT provide default values - the consuming app must define all variables.
 *
 * Branding hierarchy:
 * 1. Webapp defines default branding (base colors)
 * 2. Specialized brandings override the defaults
 *
 * Usage in your tailwind.config.js:
 * ```js
 * import { ocelotPreset } from '@ocelot-social/ui/tailwind.preset'
 *
 * export default {
 *   presets: [ocelotPreset],
 *   // your config...
 * }
 * ```
 *
 * Required CSS Variables (defined by webapp):
 * - See `requiredCssVariables` export for the full list
 */

import type { Config } from 'tailwindcss'

/**
 * List of CSS Custom Properties that must be defined by the consuming app.
 * This list grows as components are added to the library.
 */
export const requiredCssVariables: string[] = [
  // Currently empty - will be populated as components are added
  // Example: '--color-primary', '--color-primary-hover', '--color-primary-contrast'
]

/**
 * Validates that all required CSS variables are defined.
 * Call this in development to catch missing variables early.
 *
 * @example
 * ```ts
 * import { validateCssVariables } from '@ocelot-social/ui/tailwind.preset'
 *
 * if (process.env.NODE_ENV === 'development') {
 *   validateCssVariables()
 * }
 * ```
 */
export function validateCssVariables(): void {
  if (typeof window === 'undefined') return

  const styles = getComputedStyle(document.documentElement)
  const missing = requiredCssVariables.filter(
    (variable) => !styles.getPropertyValue(variable).trim(),
  )

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[@ocelot-social/ui] Missing required CSS variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\nDefine these in your app's CSS.`,
    )
  }
}

export const ocelotPreset: Partial<Config> = {
  theme: {
    extend: {
      // Colors and other theme extensions will be added here as components are developed.
      // All values use CSS Custom Properties WITHOUT defaults.
      // Example: primary: { DEFAULT: 'var(--color-primary)' }
    },
  },
}
