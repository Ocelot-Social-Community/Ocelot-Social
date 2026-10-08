// Reading a role's permission list back out of the database.
//
// `GroupRole.permissions` is stored JSON-stringified (like `Role.permissions`), so every path
// that reads a role has to parse it — the repository, the per-request authorization scope and
// the post visibility scope. One parser rather than three, because the interesting part is a
// decision and not the JSON: a list that cannot be read grants NOTHING, which is the safe
// reading of a damaged row, while anything that is not a JSON syntax error is a real fault and
// has to surface instead of being turned into "no rights".
import { sanitizeGroupPermissions } from '@src/groupPermission'

import type { GroupPermissionKey } from '@src/groupPermission'

/**
 * The permission keys a stored list holds, dropping anything the catalog does not know (a key
 * left behind by a downgrade, say — it could never be effective anyway).
 */
export function parseStoredPermissions(raw: string | null): GroupPermissionKey[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw ?? '[]')
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error
    }
    parsed = []
  }
  return sanitizeGroupPermissions(Array.isArray(parsed) ? (parsed as string[]) : [])
}
