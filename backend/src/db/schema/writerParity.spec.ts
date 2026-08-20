// `db/factories.ts` is untyped (it is neode-based and slated for replacement in the same
// migration this folder belongs to), so every Factory call is `any` to the type checker. The
// neighbouring resolver specs disable the same rules for the same reason; typing the factory
// is not this test's job.
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Ajv } from 'ajv'

import Factory, { cleanDatabase } from '@db/factories'
import { entities } from '@db/schema/index'
import { jsonSchemaFor } from '@db/schema/types'
import SignupVerification from '@graphql/queries/auth/SignupVerification.gql'
import CreateComment from '@graphql/queries/comments/CreateComment.gql'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import CreatePost from '@graphql/queries/posts/CreatePost.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { EntityDefinition } from '@db/schema/types'
import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// Do the two writers agree?
//
// Nodes reach this database by two very different routes. The resolvers write them with raw
// Cypher; `db/factories.ts` — which the seed and every other spec use — writes them through
// neode, which silently applies the model's defaults. Whatever the model declares as
// `default` therefore exists on a factory-built node and is simply absent on a resolver-built
// one, unless the resolver happens to set it too.
//
// That difference is invisible in normal tests: each spec uses one writer and asserts against
// what that writer produced. It becomes visible the moment production data (resolvers) meets
// an assumption formed on seeded data (factories) — a read that expects `user.deleted` to be
// `false` rather than absent, for instance.
//
// This spec compares the two writers per entity and reports the difference as data. It does
// NOT demand equality: some differences are legitimate (a factory sets `wasSeeded`). It
// demands that BOTH results satisfy the declaration, and it pins the known difference so that
// a new one has to be looked at rather than discovered in production.

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser, policy: {} })
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const ajv = new Ajv({ allErrors: true })

const propertiesOf = async (label: string, id?: string): Promise<Record<string, unknown>> => {
  const session = database.driver.session()
  try {
    const result = await session.readTransaction((transaction) =>
      transaction.run(
        id === undefined
          ? `MATCH (n:${label}) RETURN properties(n) AS properties LIMIT 1`
          : `MATCH (n:${label} {id: $id}) RETURN properties(n) AS properties`,
        { id },
      ),
    )
    return (result.records[0]?.get('properties') ?? {}) as Record<string, unknown>
  } finally {
    await session.close()
  }
}

const validate = (entity: EntityDefinition, properties: Record<string, unknown>): string[] => {
  const check = ajv.compile(jsonSchemaFor(entity))
  // Integers arrive as neo4j Integer instances; the declaration describes the unwrapped shape.
  const unwrapped = Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      typeof value === 'object' && value !== null && 'toNumber' in value
        ? (value as { toNumber: () => number }).toNumber()
        : value,
    ]),
  )
  return check(unwrapped)
    ? []
    : (check.errors ?? []).map((error) => `${error.instancePath} ${error.message ?? ''}`)
}

const entityFor = (label: string): EntityDefinition => {
  const entity = entities.find((candidate) => candidate.label === label)
  if (entity === undefined) {
    throw new Error(`No declaration for ${label}`)
  }
  return entity
}

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(() => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

afterEach(async () => {
  await cleanDatabase()
})

describe('User', () => {
  let viaResolver: Record<string, unknown>
  let viaFactory: Record<string, unknown>

  beforeEach(async () => {
    authenticatedUser = null
    await database.neode.model('EmailAddress').create({ email: 'john@example.org', nonce: '12345' })
    await mutate({
      mutation: SignupVerification,
      variables: {
        nonce: '12345',
        email: 'john@example.org',
        name: 'John Doe',
        password: 'Aa123456789!',
        termsAndConditionsAgreedVersion: '0.1.0',
        locale: 'en',
      },
    })
    viaResolver = await propertiesOf('User')
    await cleanDatabase()
    await Factory.build('user')
    viaFactory = await propertiesOf('User')
  })

  it('produces a node either way', () => {
    expect(Object.keys(viaResolver).length).toBeGreaterThan(0)
    expect(Object.keys(viaFactory).length).toBeGreaterThan(0)
  })

  it('satisfies the declaration either way', () => {
    expect(validate(entityFor('User'), viaResolver)).toEqual([])
    expect(validate(entityFor('User'), viaFactory)).toEqual([])
  })

  it('records which properties only one writer sets', () => {
    const onlyFactory = Object.keys(viaFactory).filter((key) => !(key in viaResolver))
    const onlyResolver = Object.keys(viaResolver).filter((key) => !(key in viaFactory))

    // Pinned, not endorsed. Every entry is a neode model default that the signup Cypher
    // (resolvers/registration.ts:70-79) does not set: a REGISTERED user has none of the nine
    // e-mail notification switches, while every SEEDED user has all nine set to true.
    //
    // Harmless today only because both readers spell the default out —
    // notificationsMiddleware.ts:31 and users.ts:644 both do `?? true`. It stops being
    // harmless the moment someone writes `if (user.emailNotificationsMention)` or filters in
    // Cypher with `= true`, which would silently exclude every real account while every test,
    // written against seeded data, keeps passing. That asymmetry is the point of this test.
    expect(onlyFactory.sort()).toEqual(
      [
        'emailNotificationsChatMessage',
        'emailNotificationsCommentOnObservedPost',
        'emailNotificationsFollowingUsers',
        'emailNotificationsGroupMemberJoined',
        'emailNotificationsGroupMemberLeft',
        'emailNotificationsGroupMemberRemoved',
        'emailNotificationsGroupMemberRoleChanged',
        'emailNotificationsMention',
        'emailNotificationsPostInGroup',
      ].sort(),
    )
    expect(onlyResolver.sort()).toEqual([])
  })

  it('writes timestamps in the same format either way', () => {
    // Two writers, two spellings: `toString(datetime())` in Cypher drops trailing zeros,
    // `new Date().toISOString()` in neode does not. Both are valid ISO 8601 — this pins the
    // fact that the strings are NOT interchangeable as raw text.
    expect(String(viaResolver.createdAt)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(String(viaFactory.createdAt)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})

describe('Post', () => {
  let viaResolver: Record<string, unknown>
  let viaFactory: Record<string, unknown>

  beforeEach(async () => {
    const author = await Factory.build('user', { id: 'author' })
    authenticatedUser = await author.toJson()
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'post-via-resolver',
        title: 'A post written through the resolver',
        content: 'Long enough to pass validation.',
        categoryIds: null,
      },
    })
    viaResolver = await propertiesOf('Post', 'post-via-resolver')
    await Factory.build('post', { id: 'post-via-factory' }, { authorId: 'author' })
    viaFactory = await propertiesOf('Post', 'post-via-factory')
  })

  it('satisfies the declaration either way', () => {
    expect(validate(entityFor('Post'), viaResolver)).toEqual([])
    expect(validate(entityFor('Post'), viaFactory)).toEqual([])
  })

  it('records which properties only one writer sets', () => {
    const onlyFactory = Object.keys(viaFactory).filter((key) => !(key in viaResolver))
    const onlyResolver = Object.keys(viaResolver).filter((key) => !(key in viaFactory))
    expect({ onlyFactory: onlyFactory.sort(), onlyResolver: onlyResolver.sort() }).toEqual({
      onlyFactory: [],
      onlyResolver: [],
    })
  })
})

describe('Group', () => {
  let viaResolver: Record<string, unknown>
  let viaFactory: Record<string, unknown>

  beforeEach(async () => {
    const owner = await Factory.build('user', { id: 'group-owner' })
    authenticatedUser = await owner.toJson()
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'group-via-resolver',
        name: 'A group written through the resolver',
        about: 'About this group',
        description: `Long enough to pass the 100 character minimum. ${'x'.repeat(100)}`,
        groupType: 'public',
        actionRadius: 'regional',
        categoryIds: null,
      },
    })
    viaResolver = await propertiesOf('Group', 'group-via-resolver')
    await Factory.build('group', { id: 'group-via-factory' }, { ownerId: 'group-owner' })
    viaFactory = await propertiesOf('Group', 'group-via-factory')
  })

  it('satisfies the declaration either way', () => {
    expect(validate(entityFor('Group'), viaResolver)).toEqual([])
    expect(validate(entityFor('Group'), viaFactory)).toEqual([])
  })

  it('records which properties only one writer sets', () => {
    // `myRole` used to show up here: db/models/Group.ts declared it with a default, so every
    // factory-built group carried a persisted `myRole: 'pending'` that no API-created group
    // has. It is not a property at all — every resolver projects it from the MEMBER_OF edge
    // (`group {.*, myRole: membership.role}`), so the stored value only ever collided with
    // the computed one. Removed from the model.
    const onlyFactory = Object.keys(viaFactory).filter((key) => !(key in viaResolver))
    const onlyResolver = Object.keys(viaResolver).filter((key) => !(key in viaFactory))
    expect({ onlyFactory: onlyFactory.sort(), onlyResolver: onlyResolver.sort() }).toEqual({
      onlyFactory: [],
      onlyResolver: [],
    })
  })
})

describe('Comment', () => {
  let viaResolver: Record<string, unknown>
  let viaFactory: Record<string, unknown>

  beforeEach(async () => {
    const author = await Factory.build('user', { id: 'comment-author' })
    await Factory.build('post', { id: 'commented-post' }, { authorId: 'comment-author' })
    authenticatedUser = await author.toJson()
    await mutate({
      mutation: CreateComment,
      variables: {
        id: 'comment-via-resolver',
        postId: 'commented-post',
        content: 'A comment written through the resolver.',
      },
    })
    viaResolver = await propertiesOf('Comment', 'comment-via-resolver')
    await Factory.build(
      'comment',
      { id: 'comment-via-factory' },
      { authorId: 'comment-author', postId: 'commented-post' },
    )
    viaFactory = await propertiesOf('Comment', 'comment-via-factory')
  })

  it('satisfies the declaration either way', () => {
    expect(validate(entityFor('Comment'), viaResolver)).toEqual([])
    expect(validate(entityFor('Comment'), viaFactory)).toEqual([])
  })

  it('records which properties only one writer sets', () => {
    const onlyFactory = Object.keys(viaFactory).filter((key) => !(key in viaResolver))
    const onlyResolver = Object.keys(viaResolver).filter((key) => !(key in viaFactory))
    expect({ onlyFactory: onlyFactory.sort(), onlyResolver: onlyResolver.sort() }).toEqual({
      onlyFactory: [],
      onlyResolver: [],
    })
  })
})
