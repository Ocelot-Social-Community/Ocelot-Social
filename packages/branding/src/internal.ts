// Internal shared helpers for the config-tree merge/clone logic — NOT part of the public API (not
// re-exported from index). Kept in one place so the (previously duplicated) plain-object test, clone,
// and the immutable deep-merge cannot drift across merge.ts / buckets.ts / the build script. Pure (no
// node deps) so it stays client-bundle-safe like its importers.

/**
 * A plain object: a non-null object whose prototype is Object.prototype. The prototype check (rather
 * than a loose `typeof === 'object' && !Array`) rules out arrays, Date / RegExp / class instances AND
 * `Object.prototype` itself — so the merge helpers only ever recurse into DATA, never into a built-in
 * prototype. Config + locale trees are plain JSON, so this never rejects a legitimate value.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  )
}

/**
 * Keys that must NEVER be copied from merge input: writing to / recursing through `__proto__` (and,
 * defensively, `constructor` / `prototype`) mutates a prototype instead of the data — prototype
 * pollution when the input is attacker-controlled JSON (a locale file, an uploaded brand fragment).
 * `__proto__` is the exploitable one here (`target.__proto__` is an object → would recurse), the other
 * two are belt-and-suspenders. Config + locale trees never legitimately carry these keys.
 */
const FORBIDDEN_MERGE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
export function isForbiddenMergeKey(key: string): boolean {
  return FORBIDDEN_MERGE_KEYS.has(key)
}

/** Deep clone via JSON (config trees are JSON-safe); `undefined` passes through unchanged. */
export function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T)
}

/**
 * IMMUTABLE deep-merge: returns a NEW object that shares NO references with `base` or `patch`; nested
 * plain objects merge, everything else (scalars, arrays) is replaced by `patch`. Every carried-over
 * value is deep-CLONED — critical because `defineBranding`'s base is the shared `brandingDefaults`
 * singleton and callers MUTATE the result downstream (the build sets ogImage / merges locale files in
 * place): a shallow `{ ...base }` would alias non-overridden branches and let one brand's build corrupt
 * the defaults (→ the next brand in the same process). For the accumulate-IN-PLACE variant (locales
 * layer) see buckets.ts `deepMergeInto`; it likewise clones, for the same aliasing reason.
 */
export function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const patchKeys = new Set(Object.keys(patch))
  for (const key of Object.keys(base)) {
    if (isForbiddenMergeKey(key) || patchKeys.has(key)) continue
    result[key] = clone(base[key]) // base-only branch → own copy, never alias base
  }
  for (const key of patchKeys) {
    if (isForbiddenMergeKey(key)) continue // prototype-pollution guard
    const baseValue = base[key]
    const patchValue = patch[key]
    result[key] =
      isPlainObject(baseValue) && isPlainObject(patchValue)
        ? deepMerge(baseValue, patchValue) // recursion clones both sides
        : clone(patchValue) // patch wins → own copy, never alias patch
  }
  return result
}
