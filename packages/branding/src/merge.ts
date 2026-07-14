// Resolve a brand's sparse overrides against the framework defaults (no lodash — this stays a
// zero-runtime-dep leaf package). `patch` wins; nested plain objects merge, everything else (scalars,
// arrays) replaces. Array-replace is intended: a brand replacing a menu / footer list wants the whole
// list, not an element-wise merge. The merge itself lives in internal.ts (shared, immutable variant).

import { brandingDefaults } from './defaults.js'
import { deepMerge } from './internal.js'
import { validateBranding } from './validate.js'

import type { BrandingConfig, BrandingOverrides } from './schema.js'

/**
 * Resolve a brand's sparse overrides against the framework defaults.
 * A brand authors `export default defineBranding({ … })` in TypeScript, so a typo or wrong SHAPE is a
 * compile error; a wrong VALUE (nonsensical but well-typed, e.g. nameLengthMin > nameLengthMax) throws
 * here (build time) via validateBranding — either way it's a red CI, never a silent runtime miss.
 */
export function defineBranding(overrides: BrandingOverrides): BrandingConfig {
  const config = deepMerge(
    brandingDefaults as unknown as Record<string, unknown>,
    overrides,
  ) as unknown as BrandingConfig
  const violations = validateBranding(config)
  if (violations.length > 0) {
    throw new Error(
      `invalid branding config (${String(violations.length)} problem(s)):\n${violations
        .map((x) => `  • ${x}`)
        .join('\n')}`,
    )
  }
  return config
}
