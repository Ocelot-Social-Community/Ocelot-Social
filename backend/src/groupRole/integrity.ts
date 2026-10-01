// Data invariants about group roles that no declaration can express.
//
// A membership names its role by STRING (`MEMBER_OF.role`), not by an edge to the role node —
// which is what lets a group rename or replace its roles without touching every membership,
// and equally what lets that string point at nothing. Neo4j has no foreign keys, so these are
// countable facts rather than enforced ones, in the same shape as the audits derived from the
// entity rules (see db/schema/derive/audit.ts) and reported by the same operator tool.
//
// Both are REPAIRABLE rather than fatal, and neither is repaired here: a group without roles is
// seeded on the next boot (seedRolesForGroupsWithoutRoles), and a dangling role name is a data
// finding that wants a human to look at it, because the right repair — which role should those
// people have? — is not something this code can know.
import { MANDATORY_GROUP_ROLE_NAMES } from './defaults'
import { PENDING_ROLE } from './types'

import type { AuditQuery } from '@db/schema/derive/audit'

const mandatoryList = `[${MANDATORY_GROUP_ROLE_NAMES.map((name) => `'${name}'`).join(', ')}]`

export const GROUP_ROLE_INTEGRITY_AUDITS: readonly AuditQuery[] = [
  {
    violation: 'Group has every mandatory role definition',
    // Fewer than the mandatory names ⇒ at least one is missing. Counting the matched names
    // rather than testing each one keeps this a single pattern comprehension.
    cypher: `MATCH (g:Group)
             WITH g, [(g)-[:HAS_GROUP_ROLE]->(r:GroupRole) WHERE r.name IN ${mandatoryList} | r.name] AS names
             WHERE size(names) < ${String(MANDATORY_GROUP_ROLE_NAMES.length)}
             RETURN count(g) AS violations`,
    sampleCypher: `MATCH (g:Group)
                   WITH g, [(g)-[:HAS_GROUP_ROLE]->(r:GroupRole) WHERE r.name IN ${mandatoryList} | r.name] AS names
                   WHERE size(names) < ${String(MANDATORY_GROUP_ROLE_NAMES.length)}
                   RETURN g.id AS id, 'has only ' + toString(names) AS detail
                   LIMIT 10`,
  },
  {
    violation: 'MEMBER_OF.role names a role the group defines',
    cypher: `MATCH (:User)-[m:MEMBER_OF]->(g:Group)
             WHERE NOT (g)-[:HAS_GROUP_ROLE]->(:GroupRole { name: m.role })
             RETURN count(m) AS violations`,
    sampleCypher: `MATCH (u:User)-[m:MEMBER_OF]->(g:Group)
                   WHERE NOT (g)-[:HAS_GROUP_ROLE]->(:GroupRole { name: m.role })
                   RETURN g.id AS id, u.id + ' carries ' + coalesce(m.role, 'null') AS detail
                   LIMIT 10`,
  },
  {
    violation: 'Group.nonMemberRead mirrors its non-member role',
    // The derived columns are written by the repository whenever a role changes. A row where
    // they disagree with the role means something wrote GroupRole nodes behind its back — a
    // migration, a restore, a fix by hand — and every feed and group list reads the column.
    cypher: `MATCH (g:Group)-[:HAS_GROUP_ROLE]->(r:GroupRole { name: 'none' })
             WHERE coalesce(g.nonMemberRead, false) <> (r.permissions CONTAINS '"group.read"')
                OR coalesce(g.nonMemberContentRead, false) <> (r.permissions CONTAINS '"group.content.read"')
                OR coalesce(g.showMembers, false) <> (r.permissions CONTAINS '"group.members.read"')
                OR coalesce(g.nonMemberJoin, false) <> (r.permissions CONTAINS '"group.join"')
             RETURN count(g) AS violations`,
    sampleCypher: `MATCH (g:Group)-[:HAS_GROUP_ROLE]->(r:GroupRole { name: 'none' })
                   WHERE coalesce(g.nonMemberRead, false) <> (r.permissions CONTAINS '"group.read"')
                      OR coalesce(g.nonMemberContentRead, false) <> (r.permissions CONTAINS '"group.content.read"')
                      OR coalesce(g.showMembers, false) <> (r.permissions CONTAINS '"group.members.read"')
                      OR coalesce(g.nonMemberJoin, false) <> (r.permissions CONTAINS '"group.join"')
                   RETURN g.id AS id, 'columns disagree with ' + coalesce(r.permissions, 'null') AS detail
                   LIMIT 10`,
  },
  {
    violation: 'A pending membership has somewhere to wait',
    // `pending` is the only role a membership can carry without the group having granted it to
    // anybody — the join path writes it. If the group has no `pending` role, those people hold
    // nothing at all, which looks like a bug to them and is one.
    cypher: `MATCH (:User)-[m:MEMBER_OF { role: '${PENDING_ROLE}' }]->(g:Group)
             WHERE NOT (g)-[:HAS_GROUP_ROLE]->(:GroupRole { name: '${PENDING_ROLE}' })
             RETURN count(m) AS violations`,
    sampleCypher: `MATCH (u:User)-[m:MEMBER_OF { role: '${PENDING_ROLE}' }]->(g:Group)
                   WHERE NOT (g)-[:HAS_GROUP_ROLE]->(:GroupRole { name: '${PENDING_ROLE}' })
                   RETURN g.id AS id, u.id + ' is waiting in a group with no pending role' AS detail
                   LIMIT 10`,
  },
]
