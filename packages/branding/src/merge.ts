// Deep-merge for plain-object config trees (no lodash dependency — keeps this a zero-runtime-dep
// leaf package). `patch` wins; nested plain objects merge, everything else (scalars, arrays)
// replaces. Array-replace is the intended semantics for branding config (a brand replacing a
// menu / footer list wants the whole list, not an element-wise merge).

import { brandingDefaults } from './defaults'

import type { BrandingConfig, BrandingOverrides } from './schema'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }
  for (const key of Object.keys(patch)) {
    const baseValue = result[key]
    const patchValue = patch[key]
    result[key] =
      isPlainObject(baseValue) && isPlainObject(patchValue)
        ? deepMerge(baseValue, patchValue)
        : patchValue
  }
  return result
}

/**
 * Resolve a brand's sparse overrides against the framework defaults.
 * A brand authors `export default defineBranding({ … })` in TypeScript, so a typo or wrong
 * shape is a compile error (and thus a red CI) rather than a silent runtime miss.
 */
export function defineBranding(overrides: BrandingOverrides): BrandingConfig {
  return deepMerge(
    brandingDefaults as unknown as Record<string, unknown>,
    overrides as Record<string, unknown>,
  ) as unknown as BrandingConfig
}
