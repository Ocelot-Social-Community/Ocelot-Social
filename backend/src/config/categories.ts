// The shared admin "environment configuration" category vocabulary — the display groups
// the config tab renders as sub-headings. Kept as a dependency-free leaf so BOTH consumers
// can validate against it without an import cycle:
//   • config/envRegistry.ts tags each env var with a category, and
//   • policy/schema.ts lets each policy key declare its `category` (validated at load).
// This mirrors how the policy schema's `visibility` keyword validates against the
// permission-derived audience vocabulary — the annotation's value set lives in one place.
//
// The array is the single source; EnvCategory is derived from it, so a new category is
// added in exactly one spot.

export const ENV_CATEGORIES = [
  'server',
  'database',
  'mail',
  'storage',
  'auth',
  'maps',
  'video',
  'redis',
  'monitoring',
  'registration',
  'features',
  'general',
] as const

export type EnvCategory = (typeof ENV_CATEGORIES)[number]
