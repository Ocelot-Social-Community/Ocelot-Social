/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
// `Factory` and the neode nodes it returns ship no types, so every fixture call is `any`
// to the type-aware rules. Same disables, same reason, as the other resolver specs.
/* eslint-disable @typescript-eslint/no-unsafe-call */
// Indexing PROBES / registry maps by a type or field name read from the schema. The keys
// come from our own .gql files, not from request data, so this is not an injection sink.
/* eslint-disable security/detect-object-injection */
import { createLoaders } from '@context/loaders'
import Factory, { cleanDatabase } from '@db/factories'
import {
  directiveInventory,
  fieldMetadata,
  representativeScalarFields,
} from '@root/test/directiveInventory'
import { createApolloTestSetup, TEST_CONFIG } from '@root/test/helpers'
import { MIGRATION_FIELD_REGISTRY } from '@root/test/migrationFieldRegistry'
import { createInMemoryPolicyService } from '@src/policy/index'

import resolvers from './resolvers/index'

import type { DirectiveField } from '@root/test/directiveInventory'
import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context/index'

// Every field that neo4j-graphql-js used to resolve via @cypher / @relation, actually
// selected against a populated database.
//
// The work list comes from MIGRATION_FIELD_REGISTRY — deliberately frozen rather than
// derived, because deriving it from the directives would have deleted each test together
// with the directive it was meant to guard. The fields are still in the schema and still
// have to resolve, so they are still listed.
//
// This was the guard the SDL snapshot test could not be: removing a @cypher directive did
// not change the printed schema at all (printSchema outputs directive DEFINITIONS, not
// their APPLICATION), so only resolving a field could detect the loss. With the directives
// gone it keeps that role for the resolvers that replaced them.

let setup: ApolloTestSetup
let authenticatedUser: Context['user']

// The social-media fixture is matched by URL, not id — see parentFor() below.
const SOCIAL_MEDIA_URL = 'https://mastodon.social/@probe'

// Fixtures shared by every probe, filled in beforeAll.
const ids = {
  user: '',
  otherUser: '',
  post: '',
  group: '',
  room: '',
  badge: '',
  category: '',
  tag: '',
  comment: '',
  message: '',
  location: '',
  socialMedia: '',
}

/** How to reach instances of a type, and how to select its directive fields. */
interface TypeProbe {
  /** Builds the operation. `selection` is the generated field selection for the type. */
  operation: (selection: string) => string
  /** Digs the instances of the type out of the response data. */
  extract: (data: any) => unknown[]
  /**
   * Per-field selection overrides — for fields with required arguments, or where the
   * default `field { __typename }` is not a valid selection.
   */
  overrides?: Record<string, string>
}

const PROBES: Record<string, TypeProbe> = {
  User: {
    operation: (selection) => `{ User(id: "${ids.user}") { id ${selection} } }`,
    extract: (data) => (data.User ?? []) as unknown[],
  },
  Post: {
    operation: (selection) => `{ Post(id: "${ids.post}") { id ${selection} } }`,
    extract: (data) => (data.Post ?? []) as unknown[],
  },
  Comment: {
    operation: (selection) => `{ Post(id: "${ids.post}") { comments { id ${selection} } } }`,
    extract: (data) => (data.Post?.[0]?.comments ?? []) as unknown[],
  },
  Group: {
    operation: (selection) => `{ Group(id: "${ids.group}") { id ${selection} } }`,
    extract: (data) => (data.Group ?? []) as unknown[],
  },
  Room: {
    operation: (selection) => `{ Room(id: "${ids.room}") { id ${selection} } }`,
    extract: (data) => (data.Room ?? []) as unknown[],
  },
  Message: {
    operation: (selection) => `{ Message(roomId: "${ids.room}") { id ${selection} } }`,
    extract: (data) => (data.Message ?? []) as unknown[],
  },
  Tag: {
    operation: (selection) => `{ Tag { id ${selection} } }`,
    extract: (data) => (data.Tag ?? []) as unknown[],
  },
  Category: {
    operation: (selection) => `{ Category { id ${selection} } }`,
    extract: (data) => (data.Category ?? []) as unknown[],
  },
  Badge: {
    operation: (selection) => `{ Badge { id ${selection} } }`,
    extract: (data) => (data.Badge ?? []) as unknown[],
  },
  Location: {
    // Location has no root query; it is only reachable through its owner.
    operation: (selection) => `{ User(id: "${ids.user}") { location { id ${selection} } } }`,
    extract: (data) => [data.User?.[0]?.location].filter(Boolean) as unknown[],
    // `lang` has a schema default, but pass it explicitly so the localisation branch of
    // the @cypher statement is the one under test, not the fallback.
    overrides: { name: 'name(lang: "en")' },
  },
  SocialMedia: {
    operation: (selection) => `{ User(id: "${ids.user}") { socialMedia { id ${selection} } } }`,
    extract: (data) => (data.User?.[0]?.socialMedia ?? []) as unknown[],
  },
}

// Types whose directive fields are deliberately NOT probed here, with the reason. Listed
// explicitly so the completeness test stays meaningful: a type may only be absent from
// PROBES if it is named here.
const UNPROBED_TYPES: Record<string, string> = {
  ApiKey:
    'ApiKey.owner is covered by apiKeys.spec.ts, which owns the key-creation flow and its permission setup.',
  InviteCode:
    'InviteCode fields are covered by inviteCodes.spec.ts, which owns code generation and redemption.',
}

const scalarFor = representativeScalarFields()

// The work list: registry entries resolved to their CURRENT schema metadata. A field whose
// directive was already replaced by a resolver still appears here — only a field deleted
// from the schema drops out, and the registry test below catches that as a mismatch.
const workList: Record<string, DirectiveField[]> = Object.fromEntries(
  Object.entries(MIGRATION_FIELD_REGISTRY).map(([typeName, fieldNames]) => [
    typeName,
    fieldNames.map((fieldName) => {
      const metadata = fieldMetadata(typeName, fieldName)
      if (!metadata) {
        throw new Error(
          `${typeName}.${fieldName} is in MIGRATION_FIELD_REGISTRY but no longer exists in the ` +
            'schema. If the field was intentionally removed, drop it from the registry; ' +
            'do NOT remove it merely because its directive was replaced.',
        )
      }
      return metadata
    }),
  ]),
)

/**
 * Builds the selection set for a type's directive fields. Object-typed fields get a scalar
 * sub-selection, which forces the related node to be fetched without depending on the rest
 * of that type's shape.
 */
const buildSelection = (fields: DirectiveField[], overrides: Record<string, string> = {}): string =>
  fields
    .map((field) => {
      if (overrides[field.name]) {
        return overrides[field.name]
      }
      if (field.requiredArgumentNames.length > 0) {
        throw new Error(
          `${field.name} has required arguments (${field.requiredArgumentNames.join(', ')}) ` +
            'but no override in PROBES. Add one so the field is actually exercised.',
        )
      }
      if (!field.isObject) {
        return field.name
      }

      const scalar = scalarFor[field.namedType]
      if (!scalar) {
        throw new Error(
          `No scalar sub-selection available for ${field.namedType} (field ${field.name}).`,
        )
      }
      return `${field.name} { ${scalar} }`
    })
    .join('\n')

beforeAll(async () => {
  await cleanDatabase()
  // Feature policies are switched ON explicitly: several types are gated behind them
  // (Category via middleware/categories.ts, groups and social media likewise), and a
  // disabled feature makes its type's probe return nothing, which would silently reduce
  // this test's coverage. Whether the gates themselves work is covered by their own specs.
  setup = await createApolloTestSetup({
    context: () => ({
      authenticatedUser,
      policy: {
        categoriesActive: true,
        badgesEnabled: true,
        groupsEnabled: true,
        socialMediaEnabled: true,
      },
    }),
  })

  const [user, otherUser, category, badge] = await Promise.all([
    Factory.build('user', { name: 'Probe Owner' }),
    Factory.build('user', { name: 'Probe Other' }),
    Factory.build('category'),
    // The badge factory's defaults do not satisfy the Badge model (`type` must be
    // verification|trophy, `icon`/`description` are required), so spell them out.
    Factory.build('badge', {
      id: 'trophy_probe',
      type: 'trophy',
      icon: '/img/badges/trophy_probe.svg',
      description: 'Probe badge',
    }),
  ])
  ids.user = user.get('id')
  ids.otherUser = otherUser.get('id')
  ids.category = category.get('id')
  ids.badge = badge.get('id')

  const [location, tag, socialMedia] = await Promise.all([
    Factory.build('location'),
    // Tag's primary key is `id`; the factory's `name` default is not a model field.
    Factory.build('tag', { id: 'probe-tag' }),
    // The SocialMedia model defaults `id` to a uuid, but the factory does not surface it,
    // so set it explicitly — the fallback test needs a parent id to match on.
    Factory.build('socialMedia', { url: SOCIAL_MEDIA_URL }),
  ])
  ids.tag = tag.get('id')
  ids.location = location.get('id')
  ids.socialMedia = (await socialMedia.toJson()).id
  await Promise.all([
    user.relateTo(location, 'isIn'),
    socialMedia.relateTo(user, 'ownedBy'),
    user.relateTo(badge, 'rewarded'),
  ])

  const post = await Factory.build('post', { title: 'Probe post' }, { authorId: ids.user })
  ids.post = post.get('id')
  await Promise.all([tag.relateTo(post, 'post'), category.relateTo(post, 'post')])

  const comment = await Factory.build('comment', {}, { authorId: ids.otherUser, postId: ids.post })
  ids.comment = comment.get('id')

  const group = await Factory.build('group', { name: 'Probe group' }, { ownerId: ids.user })
  ids.group = group.get('id')

  // Rooms and messages have no factory — they are created through their mutations, which
  // is also the only path that establishes the CHATS_IN / INSIDE edges the @cypher
  // statements on Room and Message read.
  authenticatedUser = await user.toJson()
  const message = await setup.mutate({
    mutation: `
      mutation ($userId: ID!, $content: String!) {
        CreateMessage(userId: $userId, content: $content) {
          id
          room {
            id
          }
        }
      }
    `,
    variables: { userId: ids.otherUser, content: 'Probe message' },
  })
  ids.room = message.data?.CreateMessage?.room?.id ?? ''
  ids.message = message.data?.CreateMessage?.id ?? ''
})

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('@cypher / @relation field resolution', () => {
  it('registers every field that still carries a directive', () => {
    // The registry is a superset of the live directives: it keeps fields whose directive
    // has already been replaced. What must never happen is the other direction — a
    // directive field that nobody registered, and therefore nobody tests.
    const unregistered = Object.entries(directiveInventory()).flatMap(([typeName, fields]) =>
      fields
        .filter((field) => !MIGRATION_FIELD_REGISTRY[typeName]?.includes(field.name))
        .map((field) => `${typeName}.${field.name}`),
    )

    expect(unregistered).toEqual([])
  })

  it('probes every type in the registry', () => {
    const covered = [...Object.keys(PROBES), ...Object.keys(UNPROBED_TYPES)].sort()

    // Either add a probe for the type or record — with a reason — why it is covered
    // elsewhere. Silence is not an option: an unprobed type is an untested type.
    expect(Object.keys(MIGRATION_FIELD_REGISTRY).sort()).toEqual(covered)
  })

  it('has a non-empty fixture for every probed type', async () => {
    const empty: string[] = []
    for (const [typeName, probe] of Object.entries(PROBES)) {
      // Every probe operation already selects `id`, so an empty field selection is valid.
      const { data } = await setup.query({ query: probe.operation('') })
      if (probe.extract(data ?? {}).length === 0) {
        empty.push(typeName)
      }
    }

    // A probe with no instances would pass its selection test vacuously.
    expect(empty).toEqual([])
  })

  // Subscription payloads are plain node properties (rooms.ts getRoomProperties), not the
  // result of a neo4jgraphql() translation. @cypher/@relation do not resolve on those —
  // the library installs resolvers for root fields only — so any such field a subscriber
  // selects comes back unresolved, and a NON-NULL one takes the whole payload down with it.
  //
  // Stage B3 closed this: every non-null field on a payload type now has its own resolver,
  // so the values survive on a plain-properties parent. These tests were `failing` markers
  // while the work was outstanding; they are now regular tests guarding the result.
  //
  // The list is derived from the registry, so a NEW non-null directive field on Room or
  // Message is covered automatically — and fails until it, too, gets a resolver.
  describe('subscription-payload safety', () => {
    const payloadTypes = ['Room', 'Message']

    const nonNullPayloadFields = payloadTypes.flatMap((typeName) => {
      const fields = workList[typeName]
      // Named explicitly, because this runs while jest is COLLECTING tests: an unguarded
      // `undefined.filter` here aborts the whole file with a message that mentions neither
      // the type nor the registry, and the other 200-odd cases never get to run.
      if (!fields) {
        throw new Error(
          `${typeName} is missing from MIGRATION_FIELD_REGISTRY, so its non-null payload ` +
            'fields cannot be checked. It is a subscription payload type; if it really was ' +
            'removed from the schema, drop it from payloadTypes here as well.',
        )
      }
      return fields
        .filter((field) => field.type.endsWith('!'))
        .map((field) => [typeName, field.name] as const)
    })

    it.each(nonNullPayloadFields)('%s.%s has an explicit field resolver', (typeName, fieldName) => {
      const typeResolvers = (resolvers as Record<string, Record<string, unknown>>)[typeName]
      expect(typeResolvers?.[fieldName]).toBeInstanceOf(Function)
    })
  })

  // The tests above go through a root query, so neo4jgraphql() translates the whole
  // selection and hands each field resolver a parent that ALREADY carries the value. The
  // Resolver() factory then short-circuits on `typeof parent[key] !== 'undefined'` and
  // returns it — meaning its own Cypher never runs and is never verified.
  //
  // These tests call the resolvers directly with a bare `{ id }` parent, which is what a
  // subscription payload or a hand-written root resolver produces, and what EVERY parent
  // will look like once the library is gone. This is the pass that actually exercises the
  // hand-written Cypher, so it is the one that makes stage B verifiable.
  describe('field resolvers without a neo4jgraphql translation', () => {
    // The bare parent each type's resolvers are called with. Note the KEY matters: most
    // resolvers match on `id`, but SocialMedia is registered with `idAttribute: 'url'`
    // (socialMedia.ts), so an `{ id }` parent would silently find nothing. Types absent
    // here (InviteCode, ApiKey) are covered by their own specs.
    const parentFor = (): Record<string, Record<string, string>> => ({
      User: { id: ids.user },
      Post: { id: ids.post },
      Group: { id: ids.group },
      Room: { id: ids.room },
      Message: { id: ids.message },
      Comment: { id: ids.comment },
      Badge: { id: ids.badge },
      Category: { id: ids.category },
      Tag: { id: ids.tag },
      Location: { id: ids.location },
      SocialMedia: { url: SOCIAL_MEDIA_URL },
    })

    const explicitlyResolved = Object.entries(MIGRATION_FIELD_REGISTRY).flatMap(
      ([typeName, fieldNames]) =>
        fieldNames
          .filter(
            (fieldName) =>
              typeof (resolvers as Record<string, Record<string, unknown>>)[typeName]?.[
                fieldName
              ] === 'function',
          )
          .map((fieldName) => [typeName, fieldName] as const),
    )

    // Compares the two paths rather than just checking the resolver returns something: a
    // mis-wired relation that yields an empty list is perfectly "defined".
    //
    // SCOPE, since it is easy to overestimate: while neo4j-graphql-js existed, the root
    // query was an INDEPENDENT implementation and this really did cross-check the resolver
    // against it. It is gone, so both paths now run the same resolver and differ only in
    // the parent they get — a full node from the root projection (which lets the
    // pass-through guard fire) versus a bare { id }. What this catches is the two
    // disagreeing; whether the resolver fetches the RIGHT node is on the behavioural specs
    // (posts.spec.ts and friends), which assert actual values.
    //
    // The two paths return different SHAPES — through the root query a field carries only
    // the sub-selection that buildSelection asked for, called directly it carries whole
    // nodes — so they are compared on identity rather than deep equality. The identity key
    // is the very scalar buildSelection selected (representativeScalarFields), so it is
    // present on both sides.
    //
    // null and undefined are kept APART on purpose: a field resolved through GraphQL is
    // always null when empty, never undefined, so `undefined` on the direct path means the
    // resolver returned nothing at all — exactly the failure this suite exists to catch.
    const identityOf = (value: unknown, key: string | undefined): unknown => {
      if (value === null || typeof value !== 'object' || !key) {
        return null
      }
      return (value as Record<string, unknown>)[key] ?? null
    }

    const comparable = (value: unknown, namedType: string): unknown => {
      const key = scalarFor[namedType]
      if (value === undefined) {
        return { kind: 'undefined' }
      }
      if (value === null) {
        return { kind: 'null' }
      }
      if (Array.isArray(value)) {
        // Sorted: the two paths may order a relation differently, which is not what this
        // test is about — membership is.
        return {
          kind: 'list',
          keys: value
            .map((entry) => identityOf(entry, key))
            .map((entry) => String(entry))
            .sort((a, b) => a.localeCompare(b)),
        }
      }
      if (typeof value === 'object') {
        return { kind: 'object', key: identityOf(value, key) }
      }
      return { kind: 'scalar', value }
    }

    it.each(
      explicitlyResolved.filter(
        ([typeName]) => parentFor()[typeName] !== undefined && PROBES[typeName],
      ),
    )(
      '%s.%s resolves from a bare { id } parent, matching the root-query path',
      async (typeName, fieldName) => {
        const resolver = (resolvers as Record<string, Record<string, (...args: any[]) => unknown>>)[
          typeName
        ][fieldName]

        // A full-ish context: field resolvers are not all Resolver()-generated. Some are
        // hand-written and reach for policy (User.socialMedia gates on socialMediaEnabled)
        // or database. A thin stub would fail them for the wrong reason.
        const context = {
          driver: setup.database.driver,
          database: setup.database,
          neode: setup.database.neode,
          cypherParams: { currentUserId: ids.user, languageDefault: 'EN' },
          user: { id: ids.user },
          policy: createInMemoryPolicyService({
            socialMediaEnabled: true,
            groupsEnabled: true,
            badgesEnabled: true,
            categoriesActive: true,
          }),
          config: TEST_CONFIG,
          effectivePermissions: new Set<string>(),
          loaders: createLoaders(setup.database.driver, ids.user),
        }

        const viaResolver = await resolver(parentFor()[typeName], {}, context, {})

        // The same field through the root query, i.e. resolved by neo4j-graphql-js.
        const probe = PROBES[typeName]
        // Present by construction: the work list is built from the same registry and
        // already threw in that case, but assert instead of asserting non-null.
        const field = workList[typeName].find((candidate) => candidate.name === fieldName)
        if (!field) {
          throw new Error(`${typeName}.${fieldName} missing from the work list`)
        }

        const { data, errors } = await setup.query({
          query: probe.operation(buildSelection([field], probe.overrides)),
        })
        expect(errors).toBeUndefined()

        const instances = probe.extract(data ?? {}) as Record<string, unknown>[]
        const viaLibrary = instances[0]?.[fieldName]

        expect(comparable(viaResolver, field.namedType)).toEqual(
          comparable(viaLibrary, field.namedType),
        )
      },
    )
  })

  describe.each(Object.entries(workList).filter(([typeName]) => PROBES[typeName]))(
    '%s',
    (typeName, fields) => {
      const probe = PROBES[typeName]

      it(`resolves all ${String(fields.length)} registered fields without errors`, async () => {
        const { data, errors } = await setup.query({
          query: probe.operation(buildSelection(fields, probe.overrides)),
        })

        expect(errors).toBeUndefined()

        const instances = probe.extract(data ?? {}) as Record<string, unknown>[]
        expect(instances.length).toBeGreaterThan(0)

        // Every selected field must come back as a key. A non-null field that resolves to
        // null already surfaces as a GraphQL error above; this additionally catches a
        // nullable field whose resolver vanished, which would otherwise pass silently.
        const returnedKeys = Object.keys(instances[0])
        const missing = fields.map((f) => f.name).filter((name) => !returnedKeys.includes(name))
        expect(missing).toEqual([])
      })

      // Selected one at a time as well as together: a field that throws would otherwise
      // only show up as one failing selection for the whole type, without naming the
      // field. During the migration that name is the whole point of the test.
      const resolveField = async (field: DirectiveField) => {
        const { data, errors } = await setup.query({
          query: probe.operation(buildSelection([field], probe.overrides)),
        })
        return { errors, instances: probe.extract(data ?? {}) as Record<string, unknown>[] }
      }

      it.each(fields.map((field) => [field.name, field] as const))(
        'resolves %s',
        async (fieldName, field) => {
          const { errors, instances } = await resolveField(field)

          expect(errors).toBeUndefined()
          expect(instances.length).toBeGreaterThan(0)
          expect(instances[0]).toHaveProperty(fieldName)
        },
      )

      // Split out rather than branching inside the test above: a non-null field resolving
      // to null is a schema violation with its own failure mode, and it earns its own
      // named test instead of a conditional assertion.
      const nonNullFields = fields.filter((field) => field.type.endsWith('!'))

      it.each(nonNullFields.map((field) => [field.name, field] as const))(
        'resolves non-null %s to a value',
        async (fieldName, field) => {
          const { errors, instances } = await resolveField(field)

          // Asserted before indexing: without these, a failed query or an empty probe turns
          // into "Cannot read properties of undefined", which names neither the field nor
          // the cause. On a non-null field the message IS the value of this test.
          expect(errors).toBeUndefined()
          expect(instances.length).toBeGreaterThan(0)

          expect(instances[0][fieldName]).not.toBeNull()
        },
      )
    },
  )
})
