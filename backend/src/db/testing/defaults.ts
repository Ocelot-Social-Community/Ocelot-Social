import { int } from 'neo4j-driver'
import { v4 as uuid } from 'uuid'

import { toSlug } from '@middleware/slugify/uniqueSlug'

import type { NodeProperties } from './node'
import type { EntityDefinition } from '@db/schema/types'

// What a fixture gets when the caller does not say.
//
// These were `default:` entries in src/db/models/*.ts, applied by neode on every create. 127
// spec call sites build nodes directly (`database.neode.create('User', { name, email })`) and
// rely on them: without a slug, without `deleted`, a fixture no longer satisfies the
// declaration and 460 tests fail.
//
// So the defaults stay — but in ONE file instead of scattered across twenty models, and only
// for fixtures. Production writes its own properties explicitly; that is what P5 was about.
// The difference to neode is visibility: this is a list you can read, not behaviour hidden in
// an ORM.

type Defaults = (properties: NodeProperties) => NodeProperties

// Strictly increasing, not just "now".
//
// Fixtures used to be slow enough that consecutive nodes landed in different milliseconds;
// writing Cypher directly is fast enough that several share one. Tests that order by
// `createdAt` then see a tie and the order becomes arbitrary — posts.spec's "pinned post
// appears first even when created before other posts" is exactly that. Handing out a distinct
// millisecond per fixture keeps those assertions meaningful without making them wait.
let lastTimestamp = 0
const timestamp = (): string => {
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1)
  return new Date(lastTimestamp).toISOString()
}

/** Property values arrive as `unknown`; only a string can seed a slug. */
const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback

/**
 * A default slug that two fixtures cannot share.
 *
 * `slug` is UNIQUE on User, Post and Category, so a constant fallback is a trap: two nodes
 * built without a name are fine one at a time and the second CREATE fails with
 * "already exists with label `User` and property `slug` = 'test-user'" — an error about
 * uniqueness for two fixtures that were never meant to be the same node.
 *
 * The id settles it, because it is unique by construction (the caller's, or a fresh uuid).
 * Kept readable rather than random: `test-user-u1` says which fixture it came from, and it is
 * the same slug on every run, which a uuid suffix would not be.
 */
const slugFrom = (given: unknown, fallbackName: string, id: string): string =>
  typeof given === 'string' ? toSlug(given) : toSlug(`${fallbackName}-${id}`)

const defaults = new Map<string, Defaults>([
  [
    'User',
    (properties) => {
      // Settled ONCE: calling uuid() a second time for the slug would derive it from an id
      // the node does not carry.
      const id = text(properties.id, uuid())
      return {
        id,
        // Every user in a seeded database has one; the models gave it no default, so specs
        // that create a user with just an id used to produce a nameless node.
        name: 'Test User',
        // Registration always assigns one. `toSlug` also lowercases, which is what neode's
        // `lowercase: true` on the model did to whatever the caller passed.
        slug: slugFrom(properties.name, 'Test User', id),
        deleted: false,
        disabled: false,
        allowEmbedIframes: false,
        showShoutsPublicly: false,
        emailNotificationsCommentOnObservedPost: true,
        emailNotificationsMention: true,
        emailNotificationsChatMessage: true,
        emailNotificationsGroupMemberJoined: true,
        emailNotificationsGroupMemberLeft: true,
        emailNotificationsGroupMemberRemoved: true,
        emailNotificationsGroupMemberRoleChanged: true,
        emailNotificationsFollowingUsers: true,
        emailNotificationsPostInGroup: true,
      }
    },
  ],
  [
    'Category',
    (properties) => {
      const id = text(properties.id, uuid())
      return {
        id,
        slug: slugFrom(properties.name, 'category', id),
        createdAt: timestamp(),
      }
    },
  ],
  [
    'Post',
    (properties) => {
      const id = text(properties.id, uuid())
      return {
        id,
        postType: 'Article',
        deleted: false,
        disabled: false,
        // Neo4j Integers, not JS numbers: the driver stores a plain number as a FLOAT, and
        // resolvers/posts.ts:660 reads `post.viewedTeaserCount.low` — on a float that is
        // undefined, and the mutation answers null. Same trap as SELECTED.slot.
        clickedCount: int(0),
        viewedTeaserCount: int(0),
        sortDate: timestamp(),
        // The fallback is unreachable today — `title` is required, so a titleless Post fails
        // validation before the slug matters. Spelled like the other two anyway: the day
        // `title` becomes optional, the trap would be back and silent.
        slug: slugFrom(properties.title, 'post', id),
      }
    },
  ],
  ['Comment', () => ({ id: uuid(), deleted: false, disabled: false })],
  ['Group', () => ({ id: uuid(), deleted: false, disabled: false, groupType: 'public' })],
  ['Tag', () => ({ deleted: false, disabled: false })],
  ['Report', () => ({ id: uuid(), rule: 'latestReviewUpdatedAtRules', closed: false })],
  ['Badge', () => ({ type: 'trophy' })],
  // Both had `createdAt`/`updatedAt` defaults in their models. The declaration does not
  // require them (29 of 1207 seeded images predate the properties), so nothing fills them
  // automatically — but a fresh fixture should look like a freshly written node.
  ['Image', () => ({ createdAt: timestamp(), updatedAt: timestamp(), sensitive: false })],
  ['File', () => ({ createdAt: timestamp(), updatedAt: timestamp() })],
  ['EmailAddress', () => ({ createdAt: timestamp() })],
  ['UnverifiedEmailAddress', () => ({ createdAt: timestamp() })],
  ['SocialMedia', () => ({ id: uuid(), createdAt: timestamp() })],
  ['InviteCode', () => ({ createdAt: timestamp() })],
  ['Donations', () => ({ id: uuid() })],
])

/** The caller's properties, with the entity's fixture defaults filled in underneath. */
export const withDefaults = (
  entity: EntityDefinition,
  properties: NodeProperties,
): NodeProperties => {
  const forEntity = defaults.get(entity.label)
  const filled = { ...(forEntity ? forEntity(properties) : {}), ...properties }
  // `lowercase: true` in the neode models: a slug the caller passes is normalised, not taken
  // as given. Without it a fixture can carry a slug the declaration's pattern rejects.
  if (typeof filled.slug === 'string') {
    filled.slug = toSlug(filled.slug)
  }
  // createdAt/updatedAt where the declaration demands them and no entry above covers it.
  const now = timestamp()
  const known = new Map(Object.entries(entity.properties))
  const result = new Map(Object.entries(filled))
  for (const property of ['createdAt', 'updatedAt']) {
    if (known.has(property) && entity.required.includes(property) && !result.get(property)) {
      result.set(property, now)
    }
  }
  return Object.fromEntries(result)
}

/**
 * Drops properties the entity does not declare.
 *
 * Only for the spec-facing API, never for the factories: neode filtered every create against
 * its model, and the specs pass build inputs (`password`, `role`) alongside real properties.
 * Rejecting those would mean editing dozens of test files to remove keys that never reached a
 * node in the first place.
 */
export const onlyDeclared = (
  entity: EntityDefinition,
  properties: NodeProperties,
): NodeProperties => {
  const known = new Map(Object.entries(entity.properties))
  return Object.fromEntries(Object.entries(properties).filter(([name]) => known.has(name)))
}
