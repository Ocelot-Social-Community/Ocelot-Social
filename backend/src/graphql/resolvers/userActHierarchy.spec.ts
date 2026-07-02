/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

// Act-on hierarchy (role/dominance.ts): a destructive per-user action is allowed only
// when the actor's effective permissions are a STRICT SUPERSET of the target's. These
// integration tests assert the shield enforces it for disableUser, DeleteUser, and the
// report `review` (which can disable a reported User) — closing the privilege-escalation
// hole where a holder could act on a peer or a higher-privileged user.

import Factory, { cleanDatabase } from '@db/factories'
import review from '@graphql/queries/moderation/review.gql'
import DISABLE_USER from '@graphql/queries/users/disableUser.gql'
import DELETE_USER from '@graphql/queries/users/DeleteUser.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const contextFn = () => ({ authenticatedUser })

const buildUser =(id: string, role: string) =>
  Factory.build('user', { id, name: id, role }, { email: `${id}@example.org`, password: '1234' })

describe('act-on hierarchy', () => {
  beforeAll(async () => {
    await cleanDatabase()
    authenticatedUser = null
    const apolloSetup = await createApolloTestSetup({ context: contextFn })
    mutate = apolloSetup.mutate
    database = apolloSetup.database
    server = apolloSetup.server
  })

  afterAll(async () => {
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
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  const as = async (id: string) => {
    const result = await database.neode.find('User', id)
    authenticatedUser = (await result.toJson()) as Context['user']
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
      ).resolves.toMatchObject({ errors: [{ message: 'Not Authorized!' }] })
    })

    it('forbids a moderator disabling an admin (target holds more)', async () => {
      await as('the-moderator')
      await expect(
        mutate({ mutation: DISABLE_USER, variables: { id: 'the-admin', disable: true } }),
      ).resolves.toMatchObject({ errors: [{ message: 'Not Authorized!' }] })
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
        errors: [{ message: 'Could not find User' }],
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
      ).resolves.toMatchObject({ errors: [{ message: 'Not Authorized!' }] })
    })

    it('lets an owner delete an admin (owner = full catalog ⊋ admin)', async () => {
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
})
