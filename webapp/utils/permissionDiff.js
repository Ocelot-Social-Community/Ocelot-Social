/**
 * The comparisons a rights screen makes between roles.
 *
 * Pure functions rather than component methods: none of them needs a component, and a
 * comparison is testable without mounting anything.
 */

/**
 * The rights a role effectively holds.
 *
 * A protected role — the network's `owner` — stores NO list and means the
 * whole catalog. Reading its stored list would report it as holding nothing, which is how a
 * hover over `owner` once marked every right as "removed".
 */
export function permissionSetOf(role, catalog) {
  if (!role) return new Set()
  if (role.protected) return new Set(catalog.map((permission) => permission.key))
  return new Set(role.permissions)
}

/**
 * Which catalog rights differ between two sets, in the shape the matrix marks rows with:
 * `added` for a right `to` grants and `from` does not, `removed` the other way round.
 *
 * Rights that agree are ABSENT rather than present with a falsy value, so two diffs layer with
 * `{ ...first, ...second }` and the later one wins only where it has something to say.
 */
export function diffBetween(catalog, from, to) {
  const diff = {}
  for (const permission of catalog) {
    const inFrom = from.has(permission.key)
    const inTo = to.has(permission.key)
    if (inTo && !inFrom) {
      diff[permission.key] = 'added'
    } else if (!inTo && inFrom) {
      diff[permission.key] = 'removed'
    }
  }
  return diff
}

/**
 * Whether two permission lists hold the same rights, regardless of order.
 *
 * Compared as sets in both directions: the page models a draft as an array it pushes to and
 * filters, and a length check plus a one-way lookup would call `['a', 'b']` and `['a', 'a']` the
 * same list.
 */
export function samePermissions(left, right) {
  const a = new Set(left ?? [])
  const b = new Set(right ?? [])
  return a.size === b.size && [...a].every((key) => b.has(key))
}
