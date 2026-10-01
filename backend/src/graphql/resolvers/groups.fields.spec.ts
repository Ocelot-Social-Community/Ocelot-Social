import { setTimeout as delay } from 'node:timers/promises'

import { PubSub } from 'graphql-subscriptions'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GROUP_MEMBERSHIP_VISIBILITY_CHANGED } from '@constants/subscriptions'
import { readGroupRoles } from '@src/groupRole/repository'

import resolvers from './groups'

import type { Context } from '@src/context'

// The Group FIELD resolvers, which is where the two read rights are enforced — by blanking
// rather than refusing (see mayReadGroup in groups.ts). Every one of these is a decision about
// what a viewer gets to see, and none of them needs a database to make it: the parent object
// and the authorization scope are the inputs, and a fake shows the decision directly.
vi.mock('@src/groupRole/repository', () => ({
  readGroupRoles: vi.fn(),
  seedRolesForNewGroup: vi.fn(),
  setNonMemberMemberListAccess: vi.fn(),
  applyGroupTypeToNonMemberRoles: vi.fn(),
}))

const mockedReadGroupRoles = vi.mocked(readGroupRoles)

const record = (values: Record<string, unknown>) => ({
  get: (key: string) => values[key], // eslint-disable-line security/detect-object-injection -- test fixture, literal keys
})

const contextFor = (
  options: {
    effective?: string[] | null
    records?: Array<ReturnType<typeof record>>
    sessionCount?: number
    withoutScope?: boolean
    user?: { id: string } | null
  } = {},
) => {
  const queries: Array<{ query: string; variables?: Record<string, unknown> }> = []
  const effective = new Set(options.effective ?? [])
  return {
    queries,
    context: {
      user: options.user === undefined ? { id: 'viewer' } : options.user,
      database: {
        query: vi.fn(async (args: { query: string; variables?: Record<string, unknown> }) => {
          queries.push(args)
          return Promise.resolve({ records: options.records ?? [] })
        }),
      },
      // membersCount counts through a driver session rather than the database context.
      driver: {
        session: () => ({
          readTransaction: async (work: (txc: unknown) => Promise<unknown>) =>
            work({
              run: async (query: string) => {
                queries.push({ query })
                return Promise.resolve({
                  records: [record({ count: { toNumber: () => options.sessionCount ?? 0 } })],
                })
              },
            }),
          close: async () => Promise.resolve(),
        }),
      },
      groupAuthorization: options.withoutScope
        ? undefined
        : {
            forGroup: vi.fn(async () =>
              Promise.resolve(
                options.effective === null
                  ? null
                  : { has: (permission: string) => effective.has(permission) },
              ),
            ),
          },
    } as unknown as Context,
  }
}

const { Group } = resolvers
const group = {
  id: 'g1',
  groupType: 'closed',
  description: '<p>About us</p>',
  locationName: 'Kiel',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedReadGroupRoles.mockResolvedValue([])
})

describe('the fields that need no right', () => {
  it('refuse to answer for a parent without an id', async () => {
    // Every one of these is reachable through a parent the server built itself, so a missing id
    // is a bug here rather than a request to deny.
    const { context } = contextFor()

    for (const resolve of [
      Group.myRole,
      Group.inviteCodes,
      Group.postsCount,
      Group.currentlyPinnedPostsCount,
    ]) {
      await expect(resolve({}, {}, context, null)).rejects.toThrow(
        'Can not identify selected Group!',
      )
    }
  })

  it('read the viewer`s own role', async () => {
    const { context } = contextFor({ records: [record({ role: 'admin' })] })

    expect(await Group.myRole(group, {}, context, null)).toBe('admin')
  })

  it('read the viewer`s own invite codes for this group', async () => {
    const { context } = contextFor({ records: [record({ inviteCodes: { code: 'ABC' } })] })

    expect(await Group.inviteCodes(group, {}, context, null)).toEqual([{ code: 'ABC' }])
  })

  it('count the pinned posts without asking for a right', async () => {
    // Deliberately ungated: the webapp asks it on every post it renders, including somebody's
    // own post in a group they have since left.
    const { context } = contextFor({ effective: [], records: [record({ count: '2' })] })

    expect(await Group.currentlyPinnedPostsCount(group, {}, context, null)).toBe('2')
  })
})

describe('the profile fields', () => {
  it('are blank for a viewer who may not read the group', async () => {
    // Blank rather than refused: the group still appears in the viewer's OWN list — an
    // applicant to a hidden group has to see that they applied — and a refusal would null the
    // whole group out of it.
    const { context } = contextFor({ effective: [] })

    expect(await Group.description(group, {}, context)).toBe('')
    expect(await Group.locationName(group, {}, context)).toBeNull()
    expect(await Group.categories(group, {}, context, null)).toEqual([])
    expect(await Group.location(group, {}, context, null)).toBeNull()
    expect(await Group.about({ ...group, about: 'Hi' }, {}, context, null)).toBe('')
  })

  it('are what the generated traversal found for a viewer who may', async () => {
    // The generated cypher-field resolvers answer from the parent when it already carries the
    // value, which is what the admin list and the batch loader put there — so this asserts the
    // gate delegates rather than reimplementing the traversal.
    const { context } = contextFor({ effective: ['group.read', 'group.content.read'] })
    const loaded = {
      ...group,
      categories: [{ id: 'cat1' }],
      location: { id: 'kiel' },
      posts: [{ id: 'p1' }],
    }

    expect(await Group.categories(loaded, {}, context, null)).toEqual([{ id: 'cat1' }])
    expect(await Group.location(loaded, {}, context, null)).toEqual({ id: 'kiel' })
    expect(await Group.posts(loaded, {}, context, null)).toEqual([{ id: 'p1' }])
  })

  it('are themselves for a viewer who may', async () => {
    const { context } = contextFor({ effective: ['group.read'] })

    expect(await Group.description(group, {}, context)).toBe('<p>About us</p>')
    expect(await Group.locationName(group, {}, context)).toBe('Kiel')
    expect(await Group.about({ ...group, about: 'Hi' }, {}, context, null)).toBe('Hi')
  })

  it('blank the name and the summary of a hidden group for a visitor who is not logged in', async () => {
    // An id leaking somewhere must not leak a name with it.
    const { context } = contextFor({ user: null, effective: [] })
    const hidden = { ...group, groupType: 'hidden', name: 'Secret', about: 'Hush' }

    expect(await Group.name(hidden, {}, context, null)).toBe('')
    expect(await Group.about(hidden, {}, context, null)).toBe('')
  })

  it('keep the name for anybody who is logged in, whatever the type', async () => {
    const { context } = contextFor({ effective: [] })

    expect(
      await Group.name({ ...group, groupType: 'hidden', name: 'Secret' }, {}, context, null),
    ).toBe('Secret')
  })

  it('name the hidden group a visitor was INVITED to, code in hand', async () => {
    // `invitedThroughCode` is set by InviteCode.invitedTo and is not a GraphQL field, so no
    // request can claim it. Holding the code is the entitlement the name rests on.
    const { context } = contextFor({ user: null, effective: [] })
    const invited = {
      ...group,
      groupType: 'hidden',
      name: 'Secret',
      about: 'Hush',
      invitedThroughCode: true,
    }

    expect(await Group.name(invited, {}, context, null)).toBe('Secret')
    expect(await Group.about(invited, {}, context, null)).toBe('Hush')
  })

  it('keep the name of a listed group for a visitor who is not logged in', async () => {
    const { context } = contextFor({ user: null, effective: [] })

    expect(await Group.name({ ...group, name: 'Public' }, {}, context, null)).toBe('Public')
    expect(await Group.about({ ...group, about: 'Hi' }, {}, context, null)).toBe('Hi')
  })

  it('answer as before for a partial context, which is what a unit test hands in', async () => {
    const { context } = contextFor({ withoutScope: true })

    expect(await Group.description(group, {}, context)).toBe('<p>About us</p>')
  })
})

describe('the content fields', () => {
  it('are empty without group.content.read', async () => {
    const { context } = contextFor({ effective: ['group.read'] })

    expect(await Group.postsCount(group, {}, context, null)).toBeNull()
    expect(await Group.posts(group, {}, context, null)).toEqual([])
  })

  it('count the posts for a viewer who may read them', async () => {
    const { context } = contextFor({
      effective: ['group.content.read'],
      records: [record({ count: '5' })],
    })

    expect(await Group.postsCount(group, {}, context, null)).toBe('5')
  })
})

describe('the member fields', () => {
  it('are null without group.members.read', async () => {
    // Counting members is part of seeing them: in a small group the number plus a known owner
    // is nearly the list itself.
    const { context } = contextFor({ effective: [] })

    expect(await Group.membersCount(group, {}, context, null)).toBeNull()
    expect(await Group.ownerCount(group, {}, context, null)).toBeNull()
  })

  it('count for a viewer who may see the member list', async () => {
    const { context } = contextFor({
      effective: ['group.members.read'],
      records: [record({ count: '3' })],
      sessionCount: 7,
    })

    expect(await Group.membersCount(group, {}, context, null)).toBe(7)
    expect(await Group.ownerCount(group, {}, context, null)).toBe(3)
  })

  it('take a count the parent already carries', async () => {
    // The admin list query returns both along with the group, so the field must not count a
    // second time.
    const { context, queries } = contextFor({ effective: ['group.members.read'] })

    expect(await Group.membersCount({ ...group, membersCount: 9 }, {}, context, null)).toBe(9)
    expect(await Group.ownerCount({ ...group, ownerCount: 0 }, {}, context, null)).toBe(0)
    expect(queries).toEqual([])
  })

  it('read a missing owner count as none', async () => {
    const { context } = contextFor({ effective: ['group.members.read'], records: [] })

    expect(await Group.ownerCount(group, {}, context, null)).toBe(0)
  })

  it('answer as before for a partial context', async () => {
    const { context } = contextFor({
      withoutScope: true,
      records: [record({ count: '1' })],
      sessionCount: 4,
    })

    expect(await Group.membersCount(group, {}, context, null)).toBe(4)
    expect(await Group.ownerCount(group, {}, context, null)).toBe(1)
  })
})

describe('Group.showMembers', () => {
  it('reads the right off the non-member role, which is where the setting lives now', async () => {
    mockedReadGroupRoles.mockResolvedValue([
      {
        name: 'none',
        label: null,
        system: true,
        protected: false,
        permissions: ['group.members.read'],
      },
    ])
    const { context } = contextFor()

    expect(await Group.showMembers(group, {}, context)).toBe(true)
  })

  it('is false when that role does not hold it', async () => {
    mockedReadGroupRoles.mockResolvedValue([
      { name: 'none', label: null, system: true, protected: false, permissions: ['group.read'] },
    ])
    const { context } = contextFor()

    expect(await Group.showMembers(group, {}, context)).toBe(false)
  })

  describe('for a group whose roles are not seeded yet', () => {
    // A database mid-migration. The deprecated property and the group type are what the code
    // read before the rights existed, and they stay the answer until the roles arrive.
    it('falls back to open for a public group', async () => {
      const { context } = contextFor()

      expect(await Group.showMembers({ ...group, groupType: 'public' }, {}, context)).toBe(true)
    })

    it('falls back to closed for a hidden group', async () => {
      const { context } = contextFor()

      expect(await Group.showMembers({ ...group, groupType: 'hidden' }, {}, context)).toBe(false)
    })

    it('falls back to the old setting for a closed group', async () => {
      const { context } = contextFor()

      expect(await Group.showMembers({ ...group, showMembers: true }, {}, context)).toBe(true)
      expect(await Group.showMembers(group, {}, context)).toBe(false)
    })

    it('answers for a partial context without reading any role', async () => {
      const { context } = contextFor({ withoutScope: true })
      const partial = { ...context, database: undefined } as unknown as Context

      expect(await Group.showMembers({ ...group, groupType: 'public' }, {}, partial)).toBe(true)
      expect(mockedReadGroupRoles).not.toHaveBeenCalled()
    })
  })
})

describe('Subscription.groupMembershipVisibilityChanged', () => {
  // Subscriptions bypass the shield (it gates Query and Mutation), so this filter is the only
  // thing standing in front of the event stream.
  const filter = resolvers.Subscription.groupMembershipVisibilityChanged as unknown as {
    subscribe: { filterFn?: unknown }
  } as never

  const subscriptionContext = (options: {
    user?: { id: string } | null
    groupsEnabled?: boolean
  }) =>
    ({
      user: options.user === undefined ? { id: 'viewer' } : options.user,
      policy: { getEffective: () => options.groupsEnabled ?? true },
      pubsub: { asyncIterator: () => ({}) },
    }) as unknown as Context

  const payload = { groupMembershipVisibilityChanged: { userId: 'viewer' } }

  // withFilter hides the predicate, so it is driven through the subscribe() wrapper the same
  // way the server does: publish, then see whether the iterator yields.
  const runFilter = async (context: Context, args: { userId: string }) => {
    const pubsub = new PubSub()
    const subscription = resolvers.Subscription.groupMembershipVisibilityChanged
    const iterator = subscription.subscribe(null, args, { ...context, pubsub }, null)
    const next = iterator.next() as Promise<IteratorResult<unknown>>
    await pubsub.publish(GROUP_MEMBERSHIP_VISIBILITY_CHANGED, payload)
    const DROPPED = Symbol('dropped')
    const delivered = await Promise.race([next, delay(200, DROPPED, { ref: false })])
    return delivered !== DROPPED
  }

  it('delivers the change to the viewer it is about', async () => {
    expect(await runFilter(subscriptionContext({}), { userId: 'viewer' })).toBe(true)
  })

  it('drops it for a different viewer', async () => {
    expect(await runFilter(subscriptionContext({}), { userId: 'somebody-else' })).toBe(false)
  })

  it('drops it for a visitor who is not logged in', async () => {
    expect(await runFilter(subscriptionContext({ user: null }), { userId: 'viewer' })).toBe(false)
  })

  it('drops it while the groups feature is switched off', async () => {
    // The gate has to be re-applied here, because the shield never sees a subscription.
    expect(
      await runFilter(subscriptionContext({ groupsEnabled: false }), { userId: 'viewer' }),
    ).toBe(false)
  })

  void filter
})
