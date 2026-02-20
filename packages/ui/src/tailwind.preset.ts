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
 * Usage (Tailwind v4 with legacy config):
 * ```js
 * // tailwind.config.js
 * import { ocelotPreset } from '@ocelot-social/ui/tailwind.preset'
 *
 * export default {
 *   presets: [ocelotPreset],
 * }
 * ```
 * ```css
 * /* app.css - required for Tailwind v4 to pick up the config */
 * @config "./tailwind.config.js";
 * ```
 *
 * Note: Tailwind v4 uses CSS-first configuration (@theme) by default.
 * The tailwind.config.js approach is supported for backward compatibility
 * but may be removed in future versions.
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
  // Primary
  '--color-primary',
  '--color-primary-hover',
  '--color-primary-contrast',
  // Secondary
  '--color-secondary',
  '--color-secondary-hover',
  '--color-secondary-contrast',
  // Danger
  '--color-danger',
  '--color-danger-hover',
  '--color-danger-contrast',
  // Warning
  '--color-warning',
  '--color-warning-hover',
  '--color-warning-contrast',
  // Success
  '--color-success',
  '--color-success-hover',
  '--color-success-contrast',
  // Info
  '--color-info',
  '--color-info-hover',
  '--color-info-contrast',
  // Default (neutral)
  '--color-default',
  '--color-default-contrast',
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
