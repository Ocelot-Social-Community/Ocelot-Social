// Internal shared helpers for the config-tree merge/clone logic — NOT part of the public API (not
// re-exported from index). Kept in one place so the (previously duplicated) plain-object test, clone,
// and the immutable deep-merge cannot drift across merge.ts / buckets.ts / the build script. Pure (no
// node deps) so it stays client-bundle-safe like its importers.

/** A plain (non-null, non-array) object. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Deep clone via JSON (config trees are JSON-safe); `undefined` passes through unchanged. */
export function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T)
}

/**
 * IMMUTABLE deep-merge: returns a NEW object; nested plain objects merge, everything else (scalars,
 * arrays) is replaced by `patch` — whose references are SHARED into the result. This is the semantics
 * for producing a final config (defineBranding) and for merging freshly-parsed locale files. For the
 * accumulate-IN-PLACE-and-clone variant (locales layer) see buckets.ts `deepMergeInto`.
 */
export function deepMerge(
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
