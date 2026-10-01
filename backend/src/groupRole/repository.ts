// Neo4j repository for group role definitions.
//
// Two node types, one shape: (:GroupRoleTemplate) holds the network-wide defaults per group
// type, (:GroupRole) the copy a single group owns, hanging off it via
// (:Group)-[:HAS_GROUP_ROLE]->(:GroupRole). Uniqueness is encoded in `id` —
// `<groupType>:<name>` and `<groupId>:<name>` — and enforced by the constraint the schema
// registry derives from the entity declarations. `permissions` is stored JSON-stringified,
// like Role.permissions.
//
// The editing paths at the bottom arrive with the mutations that call them — a repository
// function nobody calls is as dead as a permission nobody enforces.
import { sanitizeGroupPermissions } from '@src/groupPermission'

import { defaultTemplateFor } from './defaults'
import { nonMemberAccessFrom } from './nonMemberAccess'
import { privacyLevelFrom } from './privacyLevel'
import { parseStoredPermissions } from './storedPermissions'
import { NONE_ROLE, PENDING_ROLE } from './types'

import type { GroupRoleDefinition, GroupRoleTemplates } from './types'
import type databaseContext from '@context/database'

type DbContext = ReturnType<typeof databaseContext>

/**
 * The bit of a Neo4j transaction this module needs. Structural rather than the driver's
 * own type, because the callback of `session.writeTransaction` is typed differently across
 * driver versions and all that is wanted here is "something I can run a statement on" —
 * which also makes the seeding path trivial to fake in a unit test.
 */
export interface RoleSeedTransaction {
  run: (
    query: string,
    parameters?: Record<string, unknown>,
  ) => Promise<{ records: Array<{ get: (key: string) => unknown }> }>
}

// Shared by both node types: the stored row, before the permission list is parsed.
interface RawRoleRow {
  name: string
  label: string | null
  system: boolean
  protected: boolean
  permissions: string
}

function toDefinition(row: RawRoleRow): GroupRoleDefinition {
  return {
    name: row.name,
    label: row.label,
    system: row.system,
    protected: row.protected,
    permissions: parseStoredPermissions(row.permissions),
  }
}

const rowOf = (record: { get: (key: string) => unknown }): RawRoleRow => ({
  name: record.get('name') as string,
  label: (record.get('label') as string | null) ?? null,
  system: Boolean(record.get('system')),
  protected: Boolean(record.get('protected')),
  permissions: (record.get('permissions') as string | null) ?? '[]',
})

const RETURN_ROLE_FIELDS = `r.name AS name, r.label AS label, r.system AS system,
          r.protected AS protected, r.permissions AS permissions`

// Copy the template's roles into a newly created group. Cypher only, so it joins the
// transaction that creates the group: a group that exists without roles is a group nobody
// can act in, and the two must therefore commit or fail together.
const COPY_TEMPLATE_CYPHER = `
  MATCH (g:Group {id: $groupId})
  MATCH (t:GroupRoleTemplate {groupType: $groupType})
  MERGE (g)-[:HAS_GROUP_ROLE]->(r:GroupRole {id: $groupId + ':' + t.name})
  ON CREATE SET r.groupId = $groupId,
                r.name = t.name,
                r.label = t.label,
                r.system = t.system,
                r.protected = t.protected,
                r.permissions = t.permissions,
                r.createdAt = $now,
                r.updatedAt = $now
  RETURN collect(r.name) AS names
`

const SEED_ROLES_CYPHER = `
  MATCH (g:Group {id: $groupId})
  UNWIND $roles AS role
  MERGE (g)-[:HAS_GROUP_ROLE]->(r:GroupRole {id: $groupId + ':' + role.name})
  ON CREATE SET r.groupId = $groupId,
                r.name = role.name,
                r.label = role.label,
                r.system = role.system,
                r.protected = role.protected,
                r.permissions = role.permissions,
                r.createdAt = $now,
                r.updatedAt = $now
`

const toRow = (role: GroupRoleDefinition) => ({
  name: role.name,
  label: role.label ?? null,
  system: role.system,
  protected: role.protected,
  permissions: JSON.stringify(role.permissions),
})

/** Every role one group defines, permission lists sanitised against the catalog. */
export async function readGroupRoles(
  db: DbContext,
  groupId: string,
): Promise<GroupRoleDefinition[]> {
  const result = await db.query({
    query: `MATCH (:Group {id: $groupId})-[:HAS_GROUP_ROLE]->(r:GroupRole)
            RETURN ${RETURN_ROLE_FIELDS}
            ORDER BY r.name ASC`,
    variables: { groupId },
  })
  return result.records.map((record) => toDefinition(rowOf(record)))
}

/** The network-wide templates, grouped by group type. */
export async function readGroupRoleTemplates(db: DbContext): Promise<GroupRoleTemplates> {
  const result = await db.query({
    query: `MATCH (r:GroupRoleTemplate)
            RETURN r.groupType AS groupType, ${RETURN_ROLE_FIELDS}
            ORDER BY r.groupType ASC, r.name ASC`,
  })
  const byGroupType = new Map<string, GroupRoleDefinition[]>()
  for (const record of result.records) {
    const groupType = record.get('groupType') as string
    const roles = byGroupType.get(groupType) ?? []
    roles.push(toDefinition(rowOf(record)))
    byGroupType.set(groupType, roles)
  }
  return Object.fromEntries(byGroupType)
}

/**
 * Seed one template role — ON CREATE only, so an operator's edit is never reverted on
 * restart. The boot-seed path, mirroring seedRole() for the network roles.
 */
export async function seedGroupRoleTemplate(
  db: DbContext,
  groupType: string,
  role: GroupRoleDefinition,
  now: string,
): Promise<void> {
  await db.write({
    query: `MERGE (r:GroupRoleTemplate {id: $id})
            ON CREATE SET r.groupType = $groupType,
                          r.name = $name,
                          r.label = $label,
                          r.system = $system,
                          r.protected = $protected,
                          r.permissions = $permissions,
                          r.createdAt = $now,
                          r.updatedAt = $now`,
    variables: {
      id: `${groupType}:${role.name}`,
      groupType,
      name: role.name,
      label: role.label ?? null,
      system: role.system,
      protected: role.protected,
      permissions: JSON.stringify(role.permissions),
      now,
    },
  })
}

/**
 * Give a group its role definitions — ON CREATE per role, so running it again (a second
 * deployment, a re-run of the migration, a group created while the migration was already
 * going) adds what is missing and touches nothing that exists.
 *
 * One statement for the whole set: UNWIND rather than a write per role, because this runs
 * once per group in the migration and the round trips are what would make it slow.
 */
const NONE_ROLE_PERMISSIONS_CYPHER = `
  MATCH (:Group {id: $groupId})-[:HAS_GROUP_ROLE]->(r:GroupRole {name: $noneRole})
  RETURN r.permissions AS permissions
`

const WRITE_NON_MEMBER_ACCESS_CYPHER = `
  MATCH (g:Group {id: $groupId})
  SET g.nonMemberRead = $nonMemberRead,
      g.nonMemberContentRead = $nonMemberContentRead,
      g.showMembers = $showMembers,
      g.groupType = $groupType
`

/** A db context, as the runner the seeding path already speaks. */
const runnerFor = (db: DbContext): RoleSeedTransaction => ({
  run: async (query, variables) => db.write({ query, variables }),
})

/**
 * Recompute a group's derived non-member access from its `none` role (see ./nonMemberAccess).
 *
 * Takes the runner rather than a db context, so seeding can do this inside the very
 * transaction that writes the roles: a group whose roles exist while its derived columns do
 * not would be missing from the list it belongs in and from every feed.
 */
export async function syncNonMemberAccess(
  run: RoleSeedTransaction,
  groupId: string,
): Promise<void> {
  const result = await run.run(NONE_ROLE_PERMISSIONS_CYPHER, { groupId, noneRole: NONE_ROLE })
  const row = result.records[0]
  if (!row) {
    // No non-member role to mirror. Writing "nothing is open to a stranger" here would be a
    // statement this function is not entitled to make: a group whose roles are not seeded yet
    // would silently go invisible to everybody, where the queries' coalesce fallback reads it
    // as its TYPE says. Leaving the columns alone keeps that fallback in charge until the roles
    // exist — which seedRolesForGroupsWithoutRoles() makes sure of on the next boot.
    return
  }
  // A malformed list reads as empty, which is the safe answer for a damaged row.
  const access = nonMemberAccessFrom(parseStoredPermissions(row.get('permissions') as string))
  // `groupType` is derived from the same two rights (see ./privacyLevel.ts) and written here
  // rather than chosen: public / closed / hidden are what the rights RESULT in. Everything
  // that still reads the type — the per-level network rights, the admin filter, the enum in
  // the API — therefore reads something true instead of a label that can drift from the
  // rights it is supposed to describe.
  const groupType = privacyLevelFrom(access)
  await run.run(WRITE_NON_MEMBER_ACCESS_CYPHER, { groupId, ...access, groupType })
}

/**
 * Give a brand-new group its roles, inside the caller's transaction.
 *
 * Copies the stored (:GroupRoleTemplate) set for the group's type, so an operator's edits to
 * the templates are what a new group starts from. Falls back to the code defaults when no
 * template exists at all — the state of a freshly wiped database, which is every test run
 * after cleanDatabase(); without the fallback a group created there would have no roles and
 * nobody could do anything in it.
 */
export async function seedRolesForNewGroup(
  transaction: RoleSeedTransaction,
  groupId: string,
  groupType: string,
  now: string,
): Promise<void> {
  const copied = await transaction.run(COPY_TEMPLATE_CYPHER, { groupId, groupType, now })
  const names = (copied.records[0]?.get('names') as string[] | undefined) ?? []
  if (names.length > 0) {
    await syncNonMemberAccess(transaction, groupId)
    return
  }
  const fallback = defaultTemplateFor(groupType)
  if (!fallback) {
    // Unreachable through the API (groupType comes from the GraphQL enum, and every enum
    // value has a template — asserted in defaults.spec.ts). Left as a throw rather than a
    // silent skip so a fourth group type shows up here instead of as a group without rights.
    throw new Error(`No group role template for groupType '${groupType}'`)
  }
  await transaction.run(SEED_ROLES_CYPHER, {
    groupId,
    now,
    roles: fallback.map(toRow),
  })
  await syncNonMemberAccess(transaction, groupId)
}

const GROUPS_WITHOUT_ROLES_CYPHER = `
  MATCH (g:Group)
  WHERE NOT (g)-[:HAS_GROUP_ROLE]->(:GroupRole)
  RETURN g.id AS groupId, g.groupType AS groupType
`

/**
 * Give every group that has NO role definitions the template for its type.
 *
 * The invariant this repairs is "a group always has its roles": they are written in the same
 * transaction as the group itself, and a migration seeded the ones that predate them. Neither
 * covers a database restored from an older dump, a group created while the migration had not
 * run, or a row deleted by hand — and a group without roles is one where the shield lets
 * nobody do anything, including its own owner.
 *
 * Runs on boot, right after the template seeding it depends on (a group copies the templates).
 * Idempotent, and bounded by the number of groups in that state — normally zero, so one scan.
 */
export async function seedRolesForGroupsWithoutRoles(
  db: DbContext,
  now: string,
): Promise<{ seeded: string[]; skipped: string[] }> {
  const result = await db.query({ query: GROUPS_WITHOUT_ROLES_CYPHER, variables: {} })
  const seeded: string[] = []
  const skipped: string[] = []
  for (const record of result.records) {
    const groupId = record.get('groupId') as string
    const groupType = record.get('groupType') as string
    // A type the code has no template for is reported rather than thrown: one odd row must not
    // stop a deployment, and leaving it alone changes nothing about it.
    if (!defaultTemplateFor(groupType)) {
      skipped.push(groupId)
      continue
    }
    await seedRolesForNewGroup(runnerFor(db), groupId, groupType, now)
    seeded.push(groupId)
  }
  return { seeded, skipped }
}

/** How many members carry each role of a group. `none` never appears: it is the absence of an edge. */
export async function memberCountsByRole(
  db: DbContext,
  groupId: string,
): Promise<Map<string, number>> {
  const result = await db.query({
    query: `MATCH (:User)-[m:MEMBER_OF]->(:Group {id: $groupId})
            RETURN m.role AS roleName, toString(count(*)) AS count`,
    variables: { groupId },
  })
  return new Map(
    result.records.map((record) => [
      record.get('roleName') as string,
      Number.parseInt(record.get('count') as string, 10),
    ]),
  )
}

/** Create or replace one role of a group. */
export async function writeGroupRole(
  db: DbContext,
  groupId: string,
  role: GroupRoleDefinition,
  actor: string,
  now: string,
): Promise<void> {
  await db.write({
    query: `MATCH (g:Group {id: $groupId})
            MERGE (g)-[:HAS_GROUP_ROLE]->(r:GroupRole {id: $groupId + ':' + $name})
            ON CREATE SET r.createdAt = $now, r.groupId = $groupId, r.name = $name
            SET r.label = $label,
                r.system = $system,
                r.protected = $protected,
                r.permissions = $permissions,
                r.updatedAt = $now,
                r.updatedBy = $actor`,
    variables: {
      groupId,
      name: role.name,
      label: role.label ?? null,
      system: role.system,
      protected: role.protected,
      permissions: JSON.stringify(role.permissions),
      actor,
      now,
    },
  })
  if (role.name === NONE_ROLE) {
    await syncNonMemberAccess(runnerFor(db), groupId)
  }
}

/**
 * Rename a role in place AND move the memberships pointing at it.
 *
 * This is where the group layer differs from the network one: a HAS_ROLE edge references the
 * role NODE, so renaming a network role leaves its members alone — a membership names its group
 * role by STRING, so a rename that forgot the edges would turn every member of that role into
 * someone holding a role that does not exist (and, failing closed, holding nothing).
 */
export async function renameGroupRole(
  db: DbContext,
  groupId: string,
  oldName: string,
  newName: string,
  actor: string,
  now: string,
): Promise<void> {
  await db.write({
    query: `MATCH (g:Group {id: $groupId})-[:HAS_GROUP_ROLE]->(r:GroupRole {name: $oldName})
            SET r.id = $groupId + ':' + $newName,
                r.name = $newName,
                r.updatedAt = $now,
                r.updatedBy = $actor
            WITH g
            MATCH (:User)-[m:MEMBER_OF]->(g)
            WHERE m.role = $oldName
            SET m.role = $newName, m.updatedAt = $now`,
    variables: { groupId, oldName, newName, actor, now },
  })
}

/** Delete a role and move its members to another one, in a single statement. */
export async function deleteGroupRole(
  db: DbContext,
  groupId: string,
  name: string,
  reassignTo: string,
  now: string,
): Promise<void> {
  await db.write({
    query: `MATCH (g:Group {id: $groupId})-[:HAS_GROUP_ROLE]->(r:GroupRole {name: $name})
            WITH g, r
            OPTIONAL MATCH (:User)-[m:MEMBER_OF]->(g)
            WHERE m.role = $name
            SET m.role = $reassignTo, m.updatedAt = $now
            WITH r
            DETACH DELETE r`,
    variables: { groupId, name, reassignTo, now },
  })
}

/**
 * Put a group's roles back on a template.
 *
 * Roles the template does not have are dropped and their members moved to `fallbackRoleName`
 * — otherwise a reset would leave memberships pointing at names that no longer exist. The
 * roles the template does have are overwritten, so an edited `usual` returns to the default.
 */
export async function replaceGroupRoles(
  db: DbContext,
  groupId: string,
  roles: readonly GroupRoleDefinition[],
  fallbackRoleName: string,
  actor: string,
  now: string,
): Promise<void> {
  const keep = roles.map((role) => role.name)
  await db.write({
    query: `MATCH (g:Group {id: $groupId})-[:HAS_GROUP_ROLE]->(r:GroupRole)
            WHERE NOT r.name IN $keep
            WITH g, collect(r) AS obsolete, [role IN collect(r) | role.name] AS obsoleteNames
            OPTIONAL MATCH (:User)-[m:MEMBER_OF]->(g)
            WHERE m.role IN obsoleteNames
            SET m.role = $fallbackRoleName, m.updatedAt = $now
            WITH obsolete
            UNWIND obsolete AS role
            DETACH DELETE role`,
    variables: { groupId, keep, fallbackRoleName, now },
  })
  for (const role of roles) {
    await writeGroupRole(db, groupId, role, actor, now)
  }
}

/**
 * Re-apply a group type's template to the roles that say what OUTSIDERS may do.
 *
 * Changing the type IS a change to exactly that question — `closed` means "the profile, not the
 * content", `hidden` means "nothing at all" — so the switch WRITES those rights instead of
 * being consulted at read time. Without this, a group switched from public to closed would
 * keep a non-member role that still reads everything, and the switch would do nothing.
 *
 * Only `none` and `pending` are touched. What the group granted its own members, and any role
 * it invented, is its own business and survives the switch — as does a label it gave these two.
 */
export async function applyGroupTypeToNonMemberRoles(
  db: DbContext,
  groupId: string,
  groupType: string,
  actor: string,
  now: string,
): Promise<void> {
  const template = defaultTemplateFor(groupType)
  if (!template) {
    // Unreachable through the API: groupType comes from the GraphQL enum and every value has a
    // template (asserted in defaults.spec.ts). Leaving the roles untouched is the safe arm —
    // it keeps the group as it was rather than opening it.
    return
  }
  const existing = await readGroupRoles(db, groupId)
  // Filtering the template rather than looking each name up in it: every template has both
  // roles (the drift guard in defaults.spec.ts says so), so a "role missing from the template"
  // arm would be code no test can reach.
  const nonMemberRoles = template.filter(
    (role) => role.name === NONE_ROLE || role.name === PENDING_ROLE,
  )
  for (const fromTemplate of nonMemberRoles) {
    await writeGroupRole(
      db,
      groupId,
      {
        ...fromTemplate,
        label: existing.find((role) => role.name === fromTemplate.name)?.label ?? null,
      },
      actor,
      now,
    )
  }
}

/**
 * Mark a group as having customised its roles (concept E12).
 *
 * Only the FIRST edit is recorded: the timestamp is what the "apply the template to groups that
 * never touched their roles" admin action selects by, so it must not move every time somebody
 * flips a checkbox.
 */
export async function markGroupRolesCustomized(
  db: DbContext,
  groupId: string,
  now: string,
): Promise<void> {
  await db.write({
    query: `MATCH (g:Group {id: $groupId})
            WHERE g.rolesCustomizedAt IS NULL
            SET g.rolesCustomizedAt = $now`,
    variables: { groupId, now },
  })
}

/**
 * Switch `group.members.read` on the group's non-member role — the right that the deprecated
 * `showMembers` setting is really about.
 *
 * Kept as its own narrow function rather than going through writeGroupRole: the setting lives in
 * the group form, not in the rights matrix, and it must not overwrite whatever else the group
 * granted its non-members.
 */
export async function setNonMemberMemberListAccess(
  db: DbContext,
  groupId: string,
  allowed: boolean,
  now: string,
): Promise<void> {
  const roles = await readGroupRoles(db, groupId)
  const none = roles.find((role) => role.name === 'none')
  if (!none) {
    return
  }
  const has = none.permissions.includes('group.members.read')
  if (has === allowed) {
    return
  }
  const permissions = allowed
    ? [...none.permissions, 'group.members.read' as const]
    : none.permissions.filter((key) => key !== 'group.members.read')
  await db.write({
    query: `MATCH (:Group {id: $groupId})-[:HAS_GROUP_ROLE]->(r:GroupRole {name: 'none'})
            SET r.permissions = $permissions, r.updatedAt = $now`,
    variables: { groupId, permissions: JSON.stringify(sanitizeGroupPermissions(permissions)), now },
  })
  await syncNonMemberAccess(runnerFor(db), groupId)
}

/** Write one template role, creating it when it is not there yet (the admin edit path). */
export async function writeGroupRoleTemplate(
  db: DbContext,
  groupType: string,
  role: GroupRoleDefinition,
  actor: string,
  now: string,
): Promise<void> {
  await db.write({
    query: `MERGE (r:GroupRoleTemplate {id: $id})
            ON CREATE SET r.createdAt = $now, r.groupType = $groupType, r.name = $name
            SET r.label = $label,
                r.system = $system,
                r.protected = $protected,
                r.permissions = $permissions,
                r.updatedAt = $now,
                r.updatedBy = $actor`,
    variables: {
      id: `${groupType}:${role.name}`,
      groupType,
      name: role.name,
      label: role.label ?? null,
      system: role.system,
      protected: role.protected,
      permissions: JSON.stringify(role.permissions),
      actor,
      now,
    },
  })
}

/**
 * The groups that still run on the template untouched, by group type.
 *
 * `rolesCustomizedAt IS NULL` is the whole criterion (concept E12): a group that edited its own
 * roles is never overwritten by a network default, however tempting a bulk update is.
 */
export async function untouchedGroupIdsByType(db: DbContext): Promise<Map<string, string[]>> {
  const result = await db.query({
    query: `MATCH (g:Group)
            WHERE g.rolesCustomizedAt IS NULL
            RETURN g.groupType AS groupType, collect(g.id) AS ids`,
  })
  return new Map(
    result.records.map((record) => [
      record.get('groupType') as string,
      record.get('ids') as string[],
    ]),
  )
}
