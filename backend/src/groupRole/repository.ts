// Neo4j repository for group role definitions.
//
// Two node types, one shape: (:GroupRoleTemplate) holds the network-wide defaults per group
// type, (:GroupRole) the copy a single group owns, hanging off it via
// (:Group)-[:HAS_GROUP_ROLE]->(:GroupRole). Uniqueness is encoded in `id` —
// `<groupType>:<name>` and `<groupId>:<name>` — and enforced by the constraint the schema
// registry derives from the entity declarations. `permissions` is stored JSON-stringified,
// like Role.permissions.
//
// Only the read and seed paths live here. The editing paths (write, rename, delete, reset)
// arrive with the mutations that call them: a repository function nobody calls is as dead as
// a permission nobody enforces.
import { sanitizeGroupPermissions } from '@src/groupPermission'

import { defaultTemplateFor } from './defaults'

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

// Malformed JSON ⇒ no permissions. A role whose list cannot be read grants nothing, which
// is the safe reading; anything that is not a JSON syntax error is a real fault and rethrown.
function parsePermissions(raw: string | null): GroupRoleDefinition['permissions'] {
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

function toDefinition(row: RawRoleRow): GroupRoleDefinition {
  return {
    name: row.name,
    label: row.label,
    system: row.system,
    protected: row.protected,
    permissions: parsePermissions(row.permissions),
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
export async function seedGroupRoles(
  db: DbContext,
  groupId: string,
  roles: readonly GroupRoleDefinition[],
  now: string,
): Promise<void> {
  await db.write({
    query: SEED_ROLES_CYPHER,
    variables: { groupId, now, roles: roles.map(toRow) },
  })
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
}
