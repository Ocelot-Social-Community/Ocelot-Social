/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { setTimeout as delay } from 'node:timers/promises'

import { PubSub } from 'graphql-subscriptions'
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest'

import { VIDEO_CALL_PARTICIPANT_COUNT_CHANGED } from '@constants/subscriptions'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let listRoomsMock = vi.fn<() => Promise<unknown[]>>()
let listParticipantsMock = vi.fn<(roomName: string) => Promise<unknown[]>>()

vi.mock('livekit-server-sdk', () => {
  class MockTwirpError extends Error {
    status: number
    code?: string
    constructor(name: string, message: string, status: number, code?: string) {
      super(message)
      this.name = name
      this.status = status
      this.code = code
    }
  }
  return {
    AccessToken: vi.fn(),
    // `function`, not an arrow: the resolver calls `new RoomServiceClient(...)`.
    RoomServiceClient: vi.fn().mockImplementation(function () {
      return {
        listRooms: async () => listRoomsMock(),
        listParticipants: async (roomName: string) => listParticipantsMock(roomName),
      }
    }),
    TwirpError: MockTwirpError,
    WebhookReceiver: vi.fn(),
  }
})

const { TwirpError } = await import('livekit-server-sdk')
const { default: Factory, cleanDatabase } = await import('@db/factories')
const { default: ActiveVideoCalls } =
  await import('@graphql/queries/videoCalls/ActiveVideoCalls.gql')
const { createApolloTestSetup } = await import('@root/test/helpers')
const { takeToldRooms } = await import('@src/livekit/toldRooms')
const { default: videoCallResolvers, mayJoinCallCached } = await import('./videoCalls')

const ENABLED_LIVEKIT = {
  LIVEKIT_URL: 'wss://livekit.example.test',
  LIVEKIT_API_KEY: 'test-key',
  LIVEKIT_API_SECRET: 'test-secret',
  LIVEKIT_ENABLED: true,
}

// Group has a Joi `min: 100` constraint on `description`.
const DESCRIPTION_OVERRIDE = {
  description:
    'A descriptive paragraph for video-call test groups that is comfortably longer than the 100 character minimum required by the Group model schema.',
}

let authenticatedUser: Context['user']
let livekitConfig: Record<string, unknown> = {}
const context = () => ({
  authenticatedUser,
  config: livekitConfig,
  env: livekitConfig as Record<string, string | undefined>,
})
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
let contextFor: ApolloTestSetup['context']
let ownerJson: Context['user']
let memberJson: Context['user']
let outsiderJson: Context['user']

const room = (groupId: string) => ({ name: `group-${groupId}` })
// What a joinGroupVideoCall token puts on a participant: `<userId>#<suffix>` and the metadata.
const participant = (userId: string, joinedAt: number, suffix = 'a1b2') => ({
  identity: `${userId}#${suffix}`,
  metadata: JSON.stringify({ userId, avatarUrl: null }),
  joinedAt: BigInt(joinedAt),
})

const buildGroup = async (id: string, template: 'public' | 'closed' | 'hidden', name = id) => {
  await Factory.build(
    'group',
    { id, name, template, ...DESCRIPTION_OVERRIDE },
    { ownerId: 'owner-1' },
  )
}

const idsOf = (items: { id: string }[]) => items.map(({ id }) => id)

const addMember = async (groupId: string, userId: string, role = 'usual') => {
  const session = database.driver.session()
  try {
    await session.run(
      `MATCH (u:User {id: $userId}), (g:Group {id: $groupId})
       CREATE (u)-[:MEMBER_OF {role: $role, createdAt: toString(datetime())}]->(g)`,
      { userId, groupId, role },
    )
  } finally {
    await session.close()
  }
}

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
  contextFor = apolloSetup.context
})

beforeEach(async () => {
  await cleanDatabase()
  takeToldRooms()
  listRoomsMock = vi.fn<() => Promise<unknown[]>>().mockResolvedValue([])
  listParticipantsMock = vi.fn<(roomName: string) => Promise<unknown[]>>().mockResolvedValue([])
  livekitConfig = ENABLED_LIVEKIT
  authenticatedUser = null
  const [owner, member, outsider] = await Promise.all([
    Factory.build('user', { id: 'owner-1', name: 'Owner' }),
    Factory.build('user', { id: 'member-1', name: 'Member' }),
    Factory.build('user', { id: 'outsider-1', name: 'Outsider' }),
  ])
  ;[ownerJson, memberJson, outsiderJson] = await Promise.all([
    owner.toJson(),
    member.toJson(),
    outsider.toJson(),
  ])
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe('activeVideoCalls', () => {
  it('requires authentication', async () => {
    const { errors } = await query({ query: ActiveVideoCalls })

    expect(errors?.[0].message).toMatch(/not authorized/i)
  })

  it('lists nothing and does not ask LiveKit while video calls are off', async () => {
    livekitConfig = {}
    authenticatedUser = ownerJson

    const { data, errors } = await query({ query: ActiveVideoCalls })

    expect(errors).toBeUndefined()
    expect(data.activeVideoCalls).toEqual([])
    expect(listRoomsMock).not.toHaveBeenCalled()
  })

  it('lists a hidden group’s call to its member, with group and participants', async () => {
    await buildGroup('hidden-1', 'hidden', 'Secret Circle')
    await addMember('hidden-1', 'member-1')
    authenticatedUser = memberJson
    listRoomsMock.mockResolvedValue([room('hidden-1')])
    listParticipantsMock.mockResolvedValue([participant('owner-1', 1)])

    const { data, errors } = await query({ query: ActiveVideoCalls })

    expect(errors).toBeUndefined()
    expect(data.activeVideoCalls).toEqual([
      {
        group: { id: 'hidden-1', name: 'Secret Circle' },
        participantCount: 1,
        participants: [{ id: 'owner-1', name: 'Owner' }],
      },
    ])
  })

  it('does not list a call to somebody who may not join it', async () => {
    // Group ids are guessable and the dock lists every room on the server as a candidate, so
    // the per-group right is the only thing between an outsider and a hidden group's call.
    await Promise.all([buildGroup('hidden-1', 'hidden'), buildGroup('public-1', 'public')])
    authenticatedUser = outsiderJson
    listRoomsMock.mockResolvedValue([room('hidden-1'), room('public-1')])
    listParticipantsMock.mockResolvedValue([participant('owner-1', 1)])

    const { data, errors } = await query({ query: ActiveVideoCalls })

    expect(errors).toBeUndefined()
    expect(data.activeVideoCalls).toEqual([])
    expect(listParticipantsMock).not.toHaveBeenCalled()
  })

  it('does not list a call to an applicant whose membership is still pending', async () => {
    await buildGroup('closed-1', 'closed')
    await addMember('closed-1', 'member-1', 'pending')
    authenticatedUser = memberJson
    listRoomsMock.mockResolvedValue([room('closed-1')])
    listParticipantsMock.mockResolvedValue([participant('owner-1', 1)])

    const { data } = await query({ query: ActiveVideoCalls })

    expect(data.activeVideoCalls).toEqual([])
  })

  it('counts connections but lists each user once, in the order they joined', async () => {
    // Two people sharing one account are two connections; the count must not swallow them.
    await buildGroup('closed-1', 'closed')
    await addMember('closed-1', 'member-1')
    authenticatedUser = ownerJson
    listRoomsMock.mockResolvedValue([room('closed-1')])
    listParticipantsMock.mockResolvedValue([
      participant('owner-1', 30, 'tab2'),
      participant('member-1', 20),
      participant('owner-1', 10, 'tab1'),
    ])

    const { data } = await query({ query: ActiveVideoCalls })

    expect(data.activeVideoCalls[0].participantCount).toBe(3)
    expect(idsOf(data.activeVideoCalls[0].participants as { id: string }[])).toEqual([
      'owner-1',
      'member-1',
    ])
  })

  it('falls back to the identity for a participant whose metadata is unreadable', async () => {
    await buildGroup('closed-1', 'closed')
    authenticatedUser = ownerJson
    listRoomsMock.mockResolvedValue([room('closed-1')])
    listParticipantsMock.mockResolvedValue([
      { identity: 'owner-1#x', metadata: 'not json' },
      { identity: '', metadata: '{}' },
    ])

    const { data } = await query({ query: ActiveVideoCalls })

    expect(data.activeVideoCalls[0].participantCount).toBe(2)
    expect(data.activeVideoCalls[0].participants).toEqual([{ id: 'owner-1', name: 'Owner' }])
  })

  it('skips rooms that are not group rooms, and rooms nobody is in any more', async () => {
    await Promise.all([buildGroup('closed-1', 'closed'), buildGroup('closed-2', 'closed')])
    authenticatedUser = ownerJson
    listRoomsMock.mockResolvedValue([{ name: 'lobby' }, room('closed-1'), room('closed-2')])
    listParticipantsMock.mockImplementation(async (roomName) =>
      roomName === 'group-closed-2'
        ? Promise.reject(new TwirpError('Not Found', 'room not found', 404, 'not_found'))
        : Promise.resolve([]),
    )

    const { data, errors } = await query({ query: ActiveVideoCalls })

    expect(errors).toBeUndefined()
    expect(data.activeVideoCalls).toEqual([])
  })

  it('still lists the other calls when LiveKit cannot answer for one room', async () => {
    await Promise.all([buildGroup('closed-1', 'closed'), buildGroup('closed-2', 'closed')])
    authenticatedUser = ownerJson
    listRoomsMock.mockResolvedValue([room('closed-1'), room('closed-2')])
    listParticipantsMock.mockImplementation(async (roomName) =>
      roomName === 'group-closed-1'
        ? Promise.reject(new Error('connection reset'))
        : Promise.resolve([participant('owner-1', 1)]),
    )

    const { data, errors } = await query({ query: ActiveVideoCalls })

    expect(errors).toBeUndefined()
    expect(
      idsOf((data.activeVideoCalls as { group: { id: string } }[]).map(({ group }) => group)),
    ).toEqual(['closed-2'])
  })

  it('fails when LiveKit cannot list its rooms, rather than pretending nothing runs', async () => {
    authenticatedUser = ownerJson
    listRoomsMock.mockRejectedValue(new Error('connection refused'))

    const { errors } = await query({ query: ActiveVideoCalls })

    expect(errors?.[0].message).toMatch(/connection refused/)
  })

  it('notes the calls it tells about, so the poller corrects them if they end unseen', async () => {
    await buildGroup('closed-1', 'closed')
    authenticatedUser = ownerJson
    listRoomsMock.mockResolvedValue([room('closed-1')])
    listParticipantsMock.mockResolvedValue([participant('owner-1', 1)])

    await query({ query: ActiveVideoCalls })

    expect(takeToldRooms()).toEqual(new Set(['group-closed-1']))
  })

  it('shares the LiveKit requests of viewers who ask at the same moment', async () => {
    // A call change reaches every dock at once, and every dock asks right then.
    await buildGroup('closed-1', 'closed')
    await addMember('closed-1', 'member-1')
    listRoomsMock.mockResolvedValue([room('closed-1')])
    // LiveKit takes its time, long enough for both viewers' rights checks to come back
    // and find the question already asked.
    listParticipantsMock.mockImplementation(async () => delay(500, [participant('owner-1', 1)]))
    authenticatedUser = ownerJson
    const ownerContext = await contextFor({ headers: {} })
    authenticatedUser = memberJson
    const memberContext = await contextFor({ headers: {} })
    const activeVideoCalls = async (viewer: Context) =>
      videoCallResolvers.Query.activeVideoCalls(null, {}, viewer)

    const results = await Promise.all([
      activeVideoCalls(ownerContext),
      activeVideoCalls(memberContext),
    ])

    expect(results.map((calls) => calls.length)).toEqual([1, 1])
    expect(listRoomsMock).toHaveBeenCalledTimes(1)
    expect(listParticipantsMock).toHaveBeenCalledTimes(1)

    // …but keeps nothing once answered: the next question gets a fresh answer.
    await activeVideoCalls(ownerContext)

    expect(listRoomsMock).toHaveBeenCalledTimes(2)
    expect(listParticipantsMock).toHaveBeenCalledTimes(2)
  })
})

describe('mayJoinCallCached', () => {
  it('answers no without a user', async () => {
    authenticatedUser = null
    const subscriber = await contextFor({ headers: {} })

    await expect(mayJoinCallCached(subscriber, 'any')).resolves.toBe(false)
  })

  it('keeps the answer for a while, a no just as well as a yes', async () => {
    // Most events concern groups the subscriber is not in; asking the database for each of
    // them would cost a read per event × subscriber.
    await buildGroup('cache-1', 'hidden')
    authenticatedUser = outsiderJson
    const subscriber = await contextFor({ headers: {} })

    await expect(mayJoinCallCached(subscriber, 'cache-1')).resolves.toBe(false)

    await addMember('cache-1', 'outsider-1')

    await expect(mayJoinCallCached(subscriber, 'cache-1')).resolves.toBe(false)

    vi.useFakeTimers({ now: Date.now() + 31_000, toFake: ['Date'] })
    try {
      await expect(mayJoinCallCached(subscriber, 'cache-1')).resolves.toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('Subscription.activeVideoCallChanged', () => {
  const subscription = videoCallResolvers.Subscription.activeVideoCallChanged

  const FILTER_DROP_TIMEOUT_MS = 2000
  const DROPPED = Symbol('dropped')
  interface CountPayload {
    groupId: string
    count: number
  }

  const subscribe = async (user: Context['user']) => {
    authenticatedUser = user
    const pubsub = new PubSub()
    const subscriber = { ...(await contextFor({ headers: {} })), pubsub } as Context
    const iterator = subscription.subscribe(null, {}, subscriber, null)
    return { pubsub, subscriber, next: iterator.next() as Promise<IteratorResult<CountPayload>> }
  }
  const publish = async (pubsub: PubSub, groupId: string, count: number) =>
    pubsub.publish(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED, { groupId, count })
  const awaitDelivery = async (next: Promise<IteratorResult<CountPayload>>) =>
    Promise.race([next, delay(FILTER_DROP_TIMEOUT_MS, DROPPED, { ref: false })])

  it('pushes a change to somebody who may join that call', async () => {
    await buildGroup('sub-1', 'hidden')
    const { pubsub, next } = await subscribe(ownerJson)

    await publish(pubsub, 'sub-1', 2)
    const delivered = await awaitDelivery(next)

    expect(delivered).not.toBe(DROPPED)
    expect(subscription.resolve((delivered as IteratorYieldResult<CountPayload>).value)).toEqual({
      groupId: 'sub-1',
      call: { groupId: 'sub-1', participantCount: 2 },
    })
  })

  it('tells that a call has ended', () => {
    expect(subscription.resolve({ groupId: 'sub-1', count: 0 })).toEqual({
      groupId: 'sub-1',
      call: null,
    })
  })

  it('drops changes in groups whose call the subscriber may not join', async () => {
    await buildGroup('sub-2', 'hidden')
    const { pubsub, next } = await subscribe(outsiderJson)

    await publish(pubsub, 'sub-2', 2)

    expect(await awaitDelivery(next)).toBe(DROPPED)
  })

  it('drops every change for an unauthenticated subscriber', async () => {
    await buildGroup('sub-3', 'public')
    const { pubsub, next } = await subscribe(null)

    await publish(pubsub, 'sub-3', 2)

    expect(await awaitDelivery(next)).toBe(DROPPED)
  })

  describe('participants of a pushed call', () => {
    const participantsOf = videoCallResolvers.ActiveVideoCall.participants

    it('are asked from LiveKit, since the change only carries the count', async () => {
      authenticatedUser = ownerJson
      const subscriber = await contextFor({ headers: {} })
      listParticipantsMock.mockResolvedValue([participant('member-1', 1)])

      const users = await participantsOf({ groupId: 'g1', participantCount: 1 }, {}, subscriber)

      expect(listParticipantsMock).toHaveBeenCalledWith('group-g1')
      expect(idsOf(users as { id: string }[])).toEqual(['member-1'])
    })

    it('are empty when everybody left before they were asked', async () => {
      authenticatedUser = ownerJson
      const subscriber = await contextFor({ headers: {} })
      listParticipantsMock.mockResolvedValue([])

      await expect(
        participantsOf({ groupId: 'g1', participantCount: 1 }, {}, subscriber),
      ).resolves.toEqual([])
    })

    it('are empty when LiveKit cannot be asked, while the count stands', async () => {
      authenticatedUser = ownerJson
      const subscriber = await contextFor({ headers: {} })
      listParticipantsMock.mockRejectedValue(new Error('timeout'))

      await expect(
        participantsOf({ groupId: 'g1', participantCount: 1 }, {}, subscriber),
      ).resolves.toEqual([])
    })

    it('are empty when LiveKit is not configured', async () => {
      livekitConfig = {}
      authenticatedUser = ownerJson
      const subscriber = await contextFor({ headers: {} })

      await expect(
        participantsOf({ groupId: 'g1', participantCount: 1 }, {}, subscriber),
      ).resolves.toEqual([])
      expect(listParticipantsMock).not.toHaveBeenCalled()
    })
  })
})
