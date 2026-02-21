/**
 * CSS Variable contract for @ocelot-social/ui
 *
 * Components use CSS Custom Properties via arbitrary values (e.g. `bg-[var(--color-primary)]`)
 * rather than Tailwind theme tokens. No Tailwind preset or @config/@theme is needed.
 *
 * The consuming app must define all required CSS variables on :root:
 * ```css
 * :root {
 *   --color-primary: #6dba4a;
 *   --color-primary-hover: #7ecf5a;
 *   --color-primary-active: #4a8a30;
 *   --color-primary-contrast: #ffffff;
 *   // ... see requiredCssVariables for the full list
 * }
 * ```
 *
 * Use `validateCssVariables()` in development to catch missing variables early.
 */

/**
 * List of CSS Custom Properties that must be defined by the consuming app.
 * This list grows as components are added to the library.
 */
export const requiredCssVariables: string[] = [
  // Primary
  '--color-primary',
  '--color-primary-hover',
  '--color-primary-active',
  '--color-primary-contrast',
  // Secondary
  '--color-secondary',
  '--color-secondary-hover',
  '--color-secondary-active',
  '--color-secondary-contrast',
  // Danger
  '--color-danger',
  '--color-danger-hover',
  '--color-danger-active',
  '--color-danger-contrast',
  // Warning
  '--color-warning',
  '--color-warning-hover',
  '--color-warning-active',
  '--color-warning-contrast',
  // Success
  '--color-success',
  '--color-success-hover',
  '--color-success-active',
  '--color-success-contrast',
  // Info
  '--color-info',
  '--color-info-hover',
  '--color-info-active',
  '--color-info-contrast',
  // Default (neutral)
  '--color-default',
  '--color-default-hover',
  '--color-default-active',
  '--color-default-contrast',
  '--color-default-contrast-inverse',
  // Disabled
  '--color-disabled',
  '--color-disabled-contrast',
  // Text
  '--color-text-soft',
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

/**
 * @deprecated This preset is currently empty. Components use CSS Custom Properties
 * via arbitrary values (e.g. `bg-[var(--color-primary)]`) and do not require
 * Tailwind theme tokens. Kept for backward compatibility.
 */
export const ocelotPreset = {
  theme: {
    extend: {},
  },
} as const
