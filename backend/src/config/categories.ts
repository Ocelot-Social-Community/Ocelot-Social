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
//
// The ARRAY ORDER is also the single, global display order for the admin config and policy
// tabs: infrastructure first, then the feature policies, then diagnostics. Both tabs sort
// their rows by this order backend-side (see categoryRank + the policyConfig/systemConfig
// resolvers) and render groups in the order the rows arrive — so neither frontend keeps a
// hand-maintained order list, and a new category slots in at exactly one place here.

export const ENV_CATEGORIES = [
  // infrastructure
  'server',
  'database',
  'redis',
  'storage',
  'mail',
  'auth',
  'maps',
  // feature policies (the subset the policy tab shows, in this order)
  'registration',
  'features',
  'layout',
  'video',
  // appearance: the activeBranding policy key (managed on the dedicated admin Branding page,
  // not the generic policy editor).
  'branding',
  // diagnostics / catch-all
  'monitoring',
  'general',
] as const

export type EnvCategory = (typeof ENV_CATEGORIES)[number]

// Rank of a category in the global display order (its index in ENV_CATEGORIES). Drives the
// stable sort both admin tabs rely on. An unknown category sorts last (defensive — every
// real category is listed above), so a row is never dropped, only appended.
export function categoryRank(category: string): number {
  const index = (ENV_CATEGORIES as readonly string[]).indexOf(category)
  return index === -1 ? ENV_CATEGORIES.length : index
}
