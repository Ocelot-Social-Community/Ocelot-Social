import { DEFAULT_GROUP_ROLE_TEMPLATES } from './defaults'
import { PRIVACY_LEVELS, privacyLevelOfPermissions } from './privacyLevel'
import { readGroupRoleTemplates } from './repository'
import { NONE_ROLE } from './types'

import type { GroupPrivacyLevel } from './privacyLevel'
import type { GroupRoleDefinition } from './types'
import type databaseContext from '@context/database'

type DbContext = ReturnType<typeof databaseContext>

/**
 * A template a group can be CREATED from or put on: what it is called, what a group made from it
 * would be, and the roles it would hand that group.
 *
 * The readable half of `groupRoleTemplates`, which adds the group counts and sits behind
 * `group.roleTemplate.manage` because it is where templates are EDITED. Picking what kind of
 * group to make is not an operator's job, so this is readable by anybody who may create one.
 * The consequence has to travel with the name, because `group.create_<visibility>` is checked
 * against the visibility and two templates can derive to the same one (`channel` is public).
 *
 * The roles travel too: a group owner putting a template on their group replaces every role it
 * has, and has to be able to see what with before they do. They are no secret either — the
 * moment the template is applied, they are the group's own roles, readable on its rights page.
 */
export interface GroupTemplateChoice {
  name: string
  visibility: GroupPrivacyLevel
  roles: GroupRoleDefinition[]
}

/** What a set of role definitions makes a group — the non-member role is what decides it. */
export const templateVisibilityOf = (roles: GroupRoleDefinition[]): GroupPrivacyLevel =>
  privacyLevelOfPermissions(roles.find((role) => role.name === NONE_ROLE)?.permissions)

/**
 * Least private first, so a row of them reads as the scale it is; same-visibility templates
 * keep a stable order by name rather than whatever the map happened to hold.
 *
 * Ordered by what they DERIVE to, not by their name: sorting the names against PRIVACY_LEVELS
 * put `channel` — which is not a visibility — at -1, ahead of `public`.
 */
export const byPrivacyThenName = (a: GroupTemplateChoice, b: GroupTemplateChoice): number =>
  PRIVACY_LEVELS.indexOf(a.visibility) - PRIVACY_LEVELS.indexOf(b.visibility) ||
  a.name.localeCompare(b.name)

/**
 * The templates on offer, from the stored ones — an operator's edits are what a new group
 * starts from.
 *
 * Falls back to the code defaults when the database holds NO template at all, which is the
 * state of a freshly wiped database (every test run after cleanDatabase(), and the moment
 * before the boot seed). Without it the create rule below would answer "no such template" for
 * every name and no group could be created there at all.
 */
export async function readTemplateChoices(db: DbContext): Promise<GroupTemplateChoice[]> {
  const stored = await readGroupRoleTemplates(db)
  const templates = Object.keys(stored).length > 0 ? stored : DEFAULT_GROUP_ROLE_TEMPLATES
  return Object.entries(templates)
    .map(([name, roles]) => ({ name, visibility: templateVisibilityOf(roles), roles }))
    .sort(byPrivacyThenName)
}

/** What a group made from this template would be, or null for a name no template has. */
export async function templateVisibility(
  db: DbContext,
  name: string,
): Promise<GroupPrivacyLevel | null> {
  const choices = await readTemplateChoices(db)
  return choices.find((choice) => choice.name === name)?.visibility ?? null
}
