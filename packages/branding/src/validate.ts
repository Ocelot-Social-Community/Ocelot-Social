// Value-level validation of a resolved branding config — the OBJECTIVE invariants the TypeScript type
// cannot express (min ≤ max orderings, non-negative / positive lengths, non-empty required identity
// strings). `defineBranding` runs this and THROWS at build time when it fails, so a brand cannot ship a
// config that type-checks but is nonsensical (e.g. nameLengthMin > nameLengthMax). Pure (no node deps).
//
// Only build-time (defineBranding): the runtime composes from already-validated fragments, and each
// invariant lives inside ONE bucket domain (group/category/comment → behavior), so cross-brand
// composition cannot violate them — no need (and it would be wrong) to re-validate + throw at runtime.
import type { BrandingConfig } from './schema.js'

/**
 * Check a fully-resolved config against its value invariants. Returns a list of human-readable
 * violations — EMPTY when the config is valid (all violations are collected, not just the first).
 */
export function validateBranding(config: BrandingConfig): string[] {
  const violations: string[] = []
  const atLeast = (path: string, n: number, lo: number): void => {
    if (!(n >= lo)) violations.push(`${path} must be ≥ ${String(lo)} (got ${String(n)})`)
  }
  const atMost = (aPath: string, a: number, bPath: string, b: number): void => {
    if (!(a <= b)) violations.push(`${aPath} (${String(a)}) must be ≤ ${bPath} (${String(b)})`)
  }
  const nonEmpty = (path: string, s: string): void => {
    if (s.trim().length === 0) violations.push(`${path} must not be empty`)
  }

  const { group, registration, comment, category, badges, metadata } = config

  atLeast('group.nameLengthMin', group.nameLengthMin, 0)
  atMost('group.nameLengthMin', group.nameLengthMin, 'group.nameLengthMax', group.nameLengthMax)
  atLeast('group.descriptionMinLength', group.descriptionMinLength, 0)
  atLeast('group.descriptionExcerptLength', group.descriptionExcerptLength, 0)

  atLeast('registration.nonceLength', registration.nonceLength, 1)
  atLeast('registration.inviteCodeLength', registration.inviteCodeLength, 1)

  atLeast('comment.minLength', comment.minLength, 0)
  atLeast('comment.maxUntruncatedLength', comment.maxUntruncatedLength, 0)
  atLeast('comment.truncateToLength', comment.truncateToLength, 0)
  atMost(
    'comment.truncateToLength',
    comment.truncateToLength,
    'comment.maxUntruncatedLength',
    comment.maxUntruncatedLength,
  )

  atLeast('category.min', category.min, 0)
  atMost('category.min', category.min, 'category.max', category.max)

  atLeast('badges.trophyBadgesSelectedMax', badges.trophyBadgesSelectedMax, 0)

  nonEmpty('metadata.applicationName', metadata.applicationName)
  nonEmpty('metadata.applicationShortName', metadata.applicationShortName)
  nonEmpty('metadata.organizationName', metadata.organizationName)

  return violations
}
