// The group read rights, as Cypher conditions.
//
// Eight hand-written queries used to decide "may this viewer see that group / its content" by
// comparing `groupType` against a literal list. The rights replace that decision, and these
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
// `coalesce(…, <type comparison>)` is not the type deciding again: it is the value the seeded
// template gives a group whose column the backfill migration has not written yet.
import type { GroupPermissionKey } from '@src/groupPermission'

/** The group opened its profile to people who are not in it (`group.read`). */
export const nonMemberReadsGroup = (group: string): string =>
  `coalesce(${group}.nonMemberRead, ${group}.groupType <> 'hidden') = true`

/** The group opened its posts and comments to people who are not in it (`group.content.read`). */
export const nonMemberReadsContent = (group: string): string =>
  `coalesce(${group}.nonMemberContentRead, ${group}.groupType = 'public') = true`

/** The group opened its member list to people who are not in it (`group.members.read`). */
export const nonMemberReadsMembers = (group: string): string =>
  `coalesce(${group}.showMembers, ${group}.groupType = 'public') = true`

/**
 * The viewer holds a right in that group through their own membership.
 *
 * Matches the key inside the role's stored JSON list. The quotes are part of the needle, so
 * `"group.read"` cannot match `group.members.read` or a longer key that merely starts the same
 * way — and the alternative, parsing JSON in Cypher, needs an extension this deployment does
 * not have. A membership whose role the group has no definition for holds nothing here, which
 * is the same answer the shield gives it.
 */
export const memberHoldsInGroup = (
  group: string,
  permission: GroupPermissionKey,
  viewerIdExpression: string,
): string => `EXISTS {
      MATCH (${group})<-[membershipForRight:MEMBER_OF]-(:User { id: ${viewerIdExpression} })
      MATCH (${group})-[:HAS_GROUP_ROLE]->(roleForRight:GroupRole { name: membershipForRight.role })
      WHERE roleForRight.permissions CONTAINS '"${permission}"'
    }`
