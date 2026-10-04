// The group read rights, as Cypher conditions.
//
// Eight hand-written queries used to decide "may this viewer see that group / its content" by
// comparing `visibility` against a literal list. The rights replace that decision, and these
// builders are the single place where they are spelled in Cypher — a feed, a profile, a search
// and a count that disagree about it are four different leaks.
//
// Two shapes, because the two sides of the question have different costs:
//
//  - The NON-MEMBER side reads one mirrored column off the group node
//    (`groupRole/nonMemberAccess.ts`). That is the shape a statement over many groups can
//    afford, and the only one a feed query can.
//  - The MEMBER side has to look at the viewer's own role in that ONE group. Inside a
//    subquery bounded by a single profile or a single search page that is a role node per
//    group; the post filter instead gets the same answer hoisted into an id list once per
//    request (see viewerGroups.ts), because it runs against every post in the database.
//
// `coalesce(…, false)` fails closed for a group whose columns were never written: the backfill
// migration writes them for every group, the boot repair seeds the roles of any group that has
// none, and until both have run a group grants strangers nothing — which is the safe reading.
//
// Everything here has to run on Neo4j 4.4 (see neo4j/Dockerfile), which is stricter than 5:
// an `EXISTS { … }` subquery may hold ONE match clause (comma-separated patterns are fine) and
// may only appear in a WHERE. That is why the role lookup is a correlated pattern inside the
// same MATCH, and why the projection form below is built from plain expressions instead.
import { OWNER_ROLE } from '@src/groupRole'

import type { GroupPermissionKey } from '@src/groupPermission'

/** The group opened its profile to people who are not in it (`group.read`). */
export const nonMemberReadsGroup = (group: string): string =>
  `coalesce(${group}.nonMemberRead, false) = true`

/** The group opened its posts and comments to people who are not in it (`group.content.read`). */
export const nonMemberReadsContent = (group: string): string =>
  `coalesce(${group}.nonMemberContentRead, false) = true`

/** The group opened its member list to people who are not in it (`group.members.read`). */
export const nonMemberReadsMembers = (group: string): string =>
  `coalesce(${group}.showMembers, false) = true`

/**
 * How findable the group is, as an expression rather than a stored value.
 *
 * This is `privacyLevelFrom()` (groupRole/privacyLevel.ts) written in Cypher, and it is the
 * reason the visibility is NOT a column: it is a function of two columns that are already
 * there, so storing it would be a third copy of the same two bits — one that a direct write,
 * a restore or a half-finished migration could leave disagreeing with the rights it describes.
 *
 * The two forms have to stay in step, which is what the drift guard in the audit checks: the
 * TS function and this expression are asked the same question about the same rows.
 */
export const visibilityOf = (group: string): string =>
  `CASE
     WHEN coalesce(${group}.nonMemberRead, false) <> true THEN 'hidden'
     WHEN coalesce(${group}.nonMemberContentRead, false) <> true THEN 'closed'
     ELSE 'public'
   END`

/**
 * Whether a role holds a right, as a condition on an already-bound role node.
 *
 * Matches the key inside the role's stored JSON list. The quotes are part of the needle, so
 * `"group.read"` cannot match `group.members.read` or a longer key that merely starts the same
 * way — and the alternative, parsing JSON in Cypher, would mean an APOC call in the hot path of
 * every feed query.
 *
 * The `owner` role is the exception its definition makes everywhere else (see
 * permissionsForGroupRole): it stores an EMPTY list and resolves to the whole catalog, so that
 * a newly added key is owned automatically and an owner can never be locked out of their own
 * group. Matching only the list would lock them out of exactly that.
 */
export const roleHoldsPermission = (role: string, permission: GroupPermissionKey): string =>
  `(${role}.name = '${OWNER_ROLE}' OR coalesce(${role}.permissions, '') CONTAINS '"${permission}"')`

/**
 * The viewer holds a right in that group through their own membership — for a WHERE clause.
 *
 * One MATCH with two correlated patterns rather than two MATCH clauses, because 4.4 allows only
 * the former inside an existential subquery. A membership whose role the group has no
 * definition for matches nothing and therefore holds nothing, which is the same answer the
 * shield gives it.
 */
export const memberHoldsInGroup = (
  group: string,
  permission: GroupPermissionKey,
  viewerIdExpression: string,
): string => `EXISTS {
      MATCH (${group})<-[membershipForRight:MEMBER_OF]-(:User { id: ${viewerIdExpression} }),
            (${group})-[:HAS_GROUP_ROLE]->(roleForRight:GroupRole)
      WHERE roleForRight.name = membershipForRight.role
        AND ${roleHoldsPermission('roleForRight', permission)}
    }`

/**
 * The same question where an EXISTS subquery cannot go: as a value in a WITH or RETURN.
 *
 * Two statements, used together — the OPTIONAL MATCH binds the viewer's role in that group (at
 * most one, and null when they have no membership), and {@link memberRoleHolds} then reads the
 * right off it as a plain boolean expression.
 */
export const optionalMemberRoleMatch = (group: string, viewerIdExpression: string): string =>
  `OPTIONAL MATCH (${group})<-[membershipForRight:MEMBER_OF]-(:User { id: ${viewerIdExpression} })
   OPTIONAL MATCH (${group})-[:HAS_GROUP_ROLE]->(roleForRight:GroupRole)
   WHERE roleForRight.name = membershipForRight.role`

/** The right, read off the role {@link optionalMemberRoleMatch} bound. Null-safe. */
export const memberRoleHolds = (permission: GroupPermissionKey): string =>
  `coalesce(${roleHoldsPermission('roleForRight', permission)}, false)`
