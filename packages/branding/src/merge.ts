// Resolve a brand's sparse overrides against the framework defaults (no lodash — this stays a
// zero-runtime-dep leaf package). `patch` wins; nested plain objects merge, everything else (scalars,
// arrays) replaces. Array-replace is intended: a brand replacing a menu / footer list wants the whole
// list, not an element-wise merge. The merge itself lives in internal.ts (shared, immutable variant).

import { brandingDefaults } from './defaults.js'
import { deepMerge } from './internal.js'

import type { BrandingConfig, BrandingOverrides } from './schema.js'

/**
 * Resolve a brand's sparse overrides against the framework defaults.
 * A brand authors `export default defineBranding({ … })` in TypeScript, so a typo or wrong
 * shape is a compile error (and thus a red CI) rather than a silent runtime miss.
 */
export function defineBranding(overrides: BrandingOverrides): BrandingConfig {
  return deepMerge(
    brandingDefaults as unknown as Record<string, unknown>,
    overrides,
  ) as unknown as BrandingConfig
}
