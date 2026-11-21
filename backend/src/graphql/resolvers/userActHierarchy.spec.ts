/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

// Act-on hierarchy (role/authority.ts): a destructive per-user action is allowed only
// when the actor's role grants STRICTLY MORE AUTHORITY than the target's — participation
// rights (posting, commenting, inviting, …) do not count. These integration tests assert the
// shield enforces it for disableUser, DeleteUser, and the report `review` (which can disable a
// reported User) — closing the privilege-escalation hole where a holder could act on a peer or
// a higher-privileged user — and that User.outrankedByCurrentUser answers the same way.

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import review from '@graphql/queries/moderation/review.gql'
import DELETE_USER from '@graphql/queries/users/DeleteUser.gql'
import DISABLE_USER from '@graphql/queries/users/disableUser.gql'
import OUTRANKED from '@graphql/queries/users/UserOutrankedByCurrentUser.gql'
import { createApolloTestSetup } from '@root/test/helpers'
import { principalChangesDelivered } from '@root/test/principalChanges'
import { serverPubsub } from '@src/context'
import { listenForPrincipalChanges, principalEpoch } from '@src/context/principalEpoch'
import { allPermissionKeys } from '@src/permission'
import { DEFAULT_ROLES } from '@src/role'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { RoleDefinition } from '@src/role'

let authenticatedUser: Context['user']
let query: ApolloTestSetup['query']
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

// A role made for administration only, as networks build them: it may delete and disable
// accounts, but not post. Under the old full-set comparison it outranked nobody — not even
// a plain user, who holds post.create — while the webapp still offered both actions.
const OFFICE: RoleDefinition = {
  name: 'office',
  protected: false,
  permissions: ['user.delete.any', 'user.disable'],
}

// A role holding every right there is, as an owner may build it. By rights alone it is a second
// owner; the owner outranks it by name (outranksInNetwork).
const SUPERADMIN: RoleDefinition = {
  name: 'superadmin',
  protected: false,
  permissions: allPermissionKeys(),
}

const contextFn = () => ({ authenticatedUser, roles: [...DEFAULT_ROLES, OFFICE, SUPERADMIN] })

// The refusal a holder of the right gets; somebody without the right still gets the generic
// 'Not Authorized!' and learns nothing about the target's role.
const NOT_OUTRANKED = 'You can only do this to users whose role grants less authority than yours.'

const buildUser = (id: string, role: string) =>
  Factory.build('user', { id, name: id, role }, { email: `${id}@example.org`, password: '1234' })

// Custom roles are not seeded: build the user without one and link a real Role node, so the
// role resolves through an actual HAS_ROLE edge exactly like in production.
const buildCustomRoleUser = async (id: string, roleName: string) => {
  await Factory.build(
    'user',
    { id, name: id, role: null },
    { email: `${id}@example.org`, password: '1234' },
  )
  await database.write({
    query: `MATCH (u:User {id: $id})
            MERGE (r:Role {id: $roleName, name: $roleName})
            MERGE (u)-[:HAS_ROLE]->(r)`,
    variables: { id, roleName },
  })
}
const buildOfficeUser = async (id: string) => buildCustomRoleUser(id, 'office')

describe('act-on hierarchy', () => {
  // Counts what disableUser publishes, as index.ts does in production: a disabled user's open
  // subscriptions must read them again.
  let principalListener: number

  beforeAll(async () => {
    await cleanDatabase()
    principalListener = await listenForPrincipalChanges(serverPubsub)
    authenticatedUser = null
    const apolloSetup = await createApolloTestSetup({ context: contextFn })
    query = apolloSetup.query
    mutate = apolloSetup.mutate
    database = apolloSetup.database
    server = apolloSetup.server
  })

  afterAll(async () => {
    serverPubsub.unsubscribe(principalListener)
    await cleanDatabase()
    void server.stop()
    void database.driver.close()
    database.neode.close()
  })

  beforeEach(async () => {
    authenticatedUser = null
    await Promise.all([
      buildUser('the-owner', 'owner'),
      buildUser('the-admin', 'admin'),
      buildUser('other-admin', 'admin'),
      buildUser('the-moderator', 'moderator'),
      buildUser('other-moderator', 'moderator'),
      buildUser('plain-user', 'user'),
    ])
    await buildOfficeUser('the-office')
    await buildOfficeUser('other-office')
    await buildCustomRoleUser('the-superadmin', 'superadmin')
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  const as = async (id: string) => {
    const result = await database.neode.find('User', id)
    authenticatedUser = (await result.toJson()) as unknown as Context['user']
  }

  describe('disableUser (user.disable + dominance)', () => {
    it('lets a moderator disable a plain user (moderator ⊋ user)', async () => {
      await as('the-moderator')

      await expect(
        mutate({ mutation: DISABLE_USER, variables: { id: 'plain-user', disable: true } }),
      ).resolves.toMatchObject({
        data: { disableUser: { id: 'plain-user', disabled: true } },
        errors: undefined,
      })
    })

    it('lets the owner disable the holder of a role with the full catalog', async () => {
      await as('the-owner')

      await expect(
        mutate({ mutation: DISABLE_USER, variables: { id: 'the-superadmin', disable: true } }),
      ).resolves.toMatchObject({
        data: { disableUser: { id: 'the-superadmin', disabled: true } },
        errors: undefined,
      })
    })

    it("moves the disabled user's principal epoch", async () => {
      await as('the-moderator')
      await principalChangesDelivered(serverPubsub)
      const before = principalEpoch('plain-user')
      await mutate({ mutation: DISABLE_USER, variables: { id: 'plain-user', disable: true } })
      await principalChangesDelivered(serverPubsub)

      expect(principalEpoch('plain-user')).toBe(before + 1)
    })

    it('lets a moderator re-enable a plain user', async () => {
      await as('the-moderator')
      await mutate({ mutation: DISABLE_USER, variables: { id: 'plain-user', disable: true } })

      await expect(
        mutate({ mutation: DISABLE_USER, variables: { id: 'plain-user', disable: false } }),
      ).resolves.toMatchObject({
        data: { disableUser: { id: 'plain-user', disabled: false } },
        errors: undefined,
      })
    })

    it('forbids a moderator disabling a peer moderator (equal sets)', async () => {
      await as('the-moderator')

      await expect(
        mutate({ mutation: DISABLE_USER, variables: { id: 'other-moderator', disable: true } }),
      ).resolves.toMatchObject({ errors: [{ message: NOT_OUTRANKED }] })
    })

    it('forbids a moderator disabling an admin (target holds more)', async () => {
      await as('the-moderator')

      await expect(
        mutate({ mutation: DISABLE_USER, variables: { id: 'the-admin', disable: true } }),
      ).resolves.toMatchObject({ errors: [{ message: NOT_OUTRANKED }] })
    })

    it('lets an admin disable a moderator (admin ⊋ moderator)', async () => {
      await as('the-admin')

      await expect(
        mutate({ mutation: DISABLE_USER, variables: { id: 'the-moderator', disable: true } }),
      ).resolves.toMatchObject({
        data: { disableUser: { id: 'the-moderator', disabled: true } },
        errors: undefined,
      })
    })

    it('forbids a plain user (lacks user.disable) from disabling anyone', async () => {
      await as('plain-user')

      await expect(
        mutate({ mutation: DISABLE_USER, variables: { id: 'other-moderator', disable: true } }),
      ).resolves.toMatchObject({ errors: [{ message: 'Not Authorized!' }] })
    })

    it('errors (no silent null) when the target user does not exist', async () => {
      // The dominance shield treats a missing target as a baseline user and lets a
      // moderator through, so the resolver is reached with an empty match. It must reject
      // instead of returning null, which callers would mistake for a successful disable.
      await as('the-moderator')

      await expect(
        mutate({ mutation: DISABLE_USER, variables: { id: 'no-such-user', disable: true } }),
      ).resolves.toMatchObject({
        data: { disableUser: null },
        errors: [{ message: 'Could not find user.' }],
      })
    })
  })

  describe('DeleteUser (user.delete.any + dominance)', () => {
    it('lets an admin delete a plain user', async () => {
      await as('the-admin')

      await expect(
        mutate({ mutation: DELETE_USER, variables: { id: 'plain-user', resource: [] } }),
      ).resolves.toMatchObject({
        data: { DeleteUser: { id: 'plain-user', deleted: true } },
        errors: undefined,
      })
    })

    it('forbids an admin deleting a peer admin', async () => {
      await as('the-admin')

      await expect(
        mutate({ mutation: DELETE_USER, variables: { id: 'other-admin', resource: [] } }),
      ).resolves.toMatchObject({ errors: [{ message: NOT_OUTRANKED }] })
    })

    it('lets an owner delete an admin (the owner outranks every non-owner)', async () => {
      await as('the-owner')

      await expect(
        mutate({ mutation: DELETE_USER, variables: { id: 'the-admin', resource: [] } }),
      ).resolves.toMatchObject({
        data: { DeleteUser: { id: 'the-admin', deleted: true } },
        errors: undefined,
      })
    })

    it('forbids a moderator (lacks user.delete.any) from deleting a plain user', async () => {
      await as('the-moderator')

      await expect(
        mutate({ mutation: DELETE_USER, variables: { id: 'plain-user', resource: [] } }),
      ).resolves.toMatchObject({ errors: [{ message: 'Not Authorized!' }] })
    })

    it('still lets a user delete their own account (self-deletion stays allowed)', async () => {
      await as('plain-user')

      await expect(
        mutate({ mutation: DELETE_USER, variables: { id: 'plain-user', resource: [] } }),
      ).resolves.toMatchObject({
        data: { DeleteUser: { id: 'plain-user', deleted: true } },
        errors: undefined,
      })
    })
  })

  describe('review loophole (disabling a reported User obeys the hierarchy)', () => {
    const reportAgainst = async (targetId: string) => {
      const report = await Factory.build('report')
      const target = await database.neode.find('User', targetId)
      const filer = await database.neode.find('User', 'plain-user')
      await Promise.all([
        report.relateTo(filer, 'filed', {
          resourceId: targetId,
          reasonCategory: 'discrimination_etc',
          reasonDescription: 'reported',
        }),
        report.relateTo(target, 'belongsTo'),
      ])
    }

    it('forbids a moderator disabling an admin via report review', async () => {
      await reportAgainst('the-admin')
      await as('the-moderator')

      await expect(
        mutate({
          mutation: review,
          variables: { resourceId: 'the-admin', disable: true, closed: false },
        }),
      ).resolves.toMatchObject({ errors: [{ message: NOT_OUTRANKED }] })
    })

    it('tells a non-moderator nothing about the target (generic refusal)', async () => {
      await reportAgainst('the-admin')
      await as('the-office')

      await expect(
        mutate({
          mutation: review,
          variables: { resourceId: 'the-admin', disable: true, closed: false },
        }),
      ).resolves.toMatchObject({ errors: [{ message: 'Not Authorized!' }] })
    })

    it('lets a moderator disable a plain user via report review (control)', async () => {
      await reportAgainst('plain-user')
      await as('the-moderator')

      await expect(
        mutate({
          mutation: review,
          variables: { resourceId: 'plain-user', disable: true, closed: false },
        }),
      ).resolves.toMatchObject({
        data: { review: { resource: { __typename: 'User', id: 'plain-user', disabled: true } } },
        errors: undefined,
      })
    })
  })

  describe('an administration-only role (authority, not participation, decides)', () => {
    it('lets it delete a plain user, although the user may post and it may not', async () => {
      await as('the-office')

      await expect(
        mutate({ mutation: DELETE_USER, variables: { id: 'plain-user', resource: [] } }),
      ).resolves.toMatchObject({
        data: { DeleteUser: { id: 'plain-user', deleted: true } },
        errors: undefined,
      })
    })

    it('lets it disable a plain user', async () => {
      await as('the-office')

      await expect(
        mutate({ mutation: DISABLE_USER, variables: { id: 'plain-user', disable: true } }),
      ).resolves.toMatchObject({
        data: { disableUser: { id: 'plain-user', disabled: true } },
        errors: undefined,
      })
    })

    it('forbids it deleting a moderator (holds content.moderate, which it lacks)', async () => {
      await as('the-office')

      await expect(
        mutate({ mutation: DELETE_USER, variables: { id: 'the-moderator', resource: [] } }),
      ).resolves.toMatchObject({ errors: [{ message: NOT_OUTRANKED }] })
    })

    it('forbids it deleting a peer of the same role', async () => {
      await as('the-office')

      await expect(
        mutate({ mutation: DELETE_USER, variables: { id: 'other-office', resource: [] } }),
      ).resolves.toMatchObject({ errors: [{ message: NOT_OUTRANKED }] })
    })

    it('lets an admin delete it (admin holds all of its authority and more)', async () => {
      await as('the-admin')

      await expect(
        mutate({ mutation: DELETE_USER, variables: { id: 'the-office', resource: [] } }),
      ).resolves.toMatchObject({
        data: { DeleteUser: { id: 'the-office', deleted: true } },
        errors: undefined,
      })
    })
  })

  describe('owner over admin', () => {
    // The default admin role holds every authority right in the catalog; only the owner rule
    // in dominatesInNetwork keeps the owner above it once participation stops counting.
    it('lets an owner disable an admin', async () => {
      await as('the-owner')

      await expect(
        mutate({ mutation: DISABLE_USER, variables: { id: 'the-admin', disable: true } }),
      ).resolves.toMatchObject({
        data: { disableUser: { id: 'the-admin', disabled: true } },
        errors: undefined,
      })
    })
  })

  describe('User.outrankedByCurrentUser (what the webapp offers)', () => {
    const outranks = async (viewer: string, target: string) => {
      await as(viewer)
      const { data, errors } = await query({ query: OUTRANKED, variables: { id: target } })

      expect(errors).toBeUndefined()

      return data.User[0].outrankedByCurrentUser as boolean
    }

    it('answers exactly as the shield decides', async () => {
      await expect(outranks('the-office', 'plain-user')).resolves.toBe(true)
      await expect(outranks('the-office', 'the-moderator')).resolves.toBe(false)
      await expect(outranks('the-office', 'other-office')).resolves.toBe(false)
      await expect(outranks('the-admin', 'the-office')).resolves.toBe(true)
      await expect(outranks('the-owner', 'the-admin')).resolves.toBe(true)
      await expect(outranks('the-moderator', 'the-admin')).resolves.toBe(false)
    })

    // The full catalog adds only participation to the default admin: by authority they are peers,
    // and only the owner — by name — stands above both.
    it('places the owner above a role holding the full catalog, and that role level with admin', async () => {
      await expect(outranks('the-owner', 'the-superadmin')).resolves.toBe(true)
      await expect(outranks('the-superadmin', 'the-owner')).resolves.toBe(false)
      await expect(outranks('the-superadmin', 'the-admin')).resolves.toBe(false)
      await expect(outranks('the-admin', 'the-superadmin')).resolves.toBe(false)
    })

    it('is false for oneself', async () => {
      await expect(outranks('the-owner', 'the-owner')).resolves.toBe(false)
    })

    it('is false for a viewer without any authority', async () => {
      await expect(outranks('plain-user', 'the-office')).resolves.toBe(false)
    })
  })
})
