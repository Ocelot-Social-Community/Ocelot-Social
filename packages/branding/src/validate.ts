// Value-level validation of a resolved branding config — the OBJECTIVE invariants the TypeScript type
// cannot express (min ≤ max orderings, non-negative / positive lengths, non-empty required identity
// strings). `defineBranding` runs this and THROWS at build time when it fails, so a brand cannot ship a
// config that type-checks but is nonsensical (e.g. nameLengthMin > nameLengthMax). Pure (no node deps).
//
// Only build-time (defineBranding): the runtime composes from already-validated fragments, and each
// invariant lives inside ONE bucket domain (group/category/comment → behavior), so cross-brand
// composition cannot violate them — no need (and it would be wrong) to re-validate + throw at runtime.
import { COLOR_SCHEMES } from './theme.js'

import type { BrandingConfig } from './schema.js'

/**
 * The shortest user name any brand may require. Exported because the backend relies on it: its DB
 * schema declares `User.name` no stricter than this (asserted in `db/schema/schema.spec.ts`), so
 * the audit never flags a name that a valid brand allowed. 1, not 0: a user without a name has
 * nothing to show next to their posts.
 */
export const USER_NAME_LENGTH_FLOOR = 1

/** The shortest slug any brand may require: an empty one would leave the profile URL without its last segment. */
export const USER_SLUG_LENGTH_FLOOR = 1

/**
 * The lowest `user.slugLengthMax` a brand may set. A slug derived from a taken name gets a `-<n>`
 * suffix inside the same maximum, so the maximum must leave room for at least one character of the
 * name, the hyphen and the counter — 8 fits a six-digit one (`x-123456`).
 */
export const USER_SLUG_LENGTH_MAX_FLOOR = 8

/**
 * Check a fully-resolved config against its value invariants. Returns a list of human-readable
 * violations — EMPTY when the config is valid (all violations are collected, not just the first).
 */
export function validateBranding(config: BrandingConfig): string[] {
  const violations: string[] = []
  const atLeast = (path: string, n: number, lo: number): void => {
    if (!(n >= lo)) {
      violations.push(`${path} must be ≥ ${String(lo)} (got ${String(n)})`)
    }
  }
  const atMost = (aPath: string, a: number, bPath: string, b: number): void => {
    if (!(a <= b)) {
      violations.push(`${aPath} (${String(a)}) must be ≤ ${bPath} (${String(b)})`)
    }
  }
  const nonEmpty = (path: string, s: string): void => {
    if (s.trim().length === 0) {
      violations.push(`${path} must not be empty`)
    }
  }

  const { group, user, registration, comment, category, badges, metadata, dateTime } = config

  atLeast('group.nameLengthMin', group.nameLengthMin, 0)
  atMost('group.nameLengthMin', group.nameLengthMin, 'group.nameLengthMax', group.nameLengthMax)
  atLeast('group.descriptionMinLength', group.descriptionMinLength, 0)
  atLeast('group.descriptionExcerptLength', group.descriptionExcerptLength, 0)
  // At least one line, otherwise the collapsed preview shows nothing at all.
  atLeast('group.descriptionCollapsedLines', group.descriptionCollapsedLines, 1)

  atLeast('user.nameLengthMin', user.nameLengthMin, USER_NAME_LENGTH_FLOOR)
  atMost('user.nameLengthMin', user.nameLengthMin, 'user.nameLengthMax', user.nameLengthMax)
  atLeast('user.slugLengthMin', user.slugLengthMin, USER_SLUG_LENGTH_FLOOR)
  atLeast('user.slugLengthMax', user.slugLengthMax, USER_SLUG_LENGTH_MAX_FLOOR)
  atMost('user.slugLengthMin', user.slugLengthMin, 'user.slugLengthMax', user.slugLengthMax)

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

  // Intl.DateTimeFormat needs one of them; with neither the absolute timestamp has nothing to show.
  if (dateTime.dateStyle === null && dateTime.timeStyle === null) {
    violations.push('dateTime.dateStyle and dateTime.timeStyle must not both be null')
  }

  if (!COLOR_SCHEMES.includes(config.theme.colorScheme)) {
    violations.push(
      `theme.colorScheme must be one of ${COLOR_SCHEMES.map((s) => `'${s}'`).join(', ')} (got '${config.theme.colorScheme}')`,
    )
  }

  return violations
}
