/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { setTimeout as delay } from 'node:timers/promises'

import { PubSub } from 'graphql-subscriptions'
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest'

import { VIDEO_CALL_PARTICIPANT_COUNT_CHANGED } from '@constants/subscriptions'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { RoleDefinition } from '@src/role'

let listParticipantsMock = vi.fn<(...args: unknown[]) => Promise<unknown>>()

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
    AccessToken: vi
      .fn<(apiKey: string, apiSecret: string, opts: unknown) => unknown>()
      .mockImplementation(function (apiKey: string, _apiSecret: string, opts) {
        const grants: Record<string, unknown> = {}
        return {
          addGrant: (g: Record<string, unknown>) => Object.assign(grants, g),
          // eslint-disable-next-line @typescript-eslint/promise-function-async
          toJwt: () =>
            Promise.resolve(
              `mocked-jwt.${apiKey}.${(opts as { identity: string }).identity}.${(grants as { room?: string }).room ?? ''}`,
            ),
        }
      }),
    // `function`, not an arrow: the resolver calls `new RoomServiceClient(...)` and vitest
    // constructs the implementation with Reflect.construct, which arrows do not support.
    RoomServiceClient: vi.fn().mockImplementation(function () {
      return {
        listParticipants: async (roomName: string) => listParticipantsMock(roomName),
      }
    }),
    TwirpError: MockTwirpError,
    WebhookReceiver: vi.fn(),
  }
})

// Imported below the mock registrations — a carry-over from Jest's ESM mode, where the
// registration did not hoist. `vi.mock` does hoist, so a static import would bind the mock too.
const { AccessToken, RoomServiceClient, TwirpError } = await import('livekit-server-sdk')
const { default: Factory, cleanDatabase } = await import('@db/factories')
const { default: JoinGroupVideoCall } =
  await import('@graphql/queries/videoCalls/JoinGroupVideoCall.gql')
const { default: VideoCallConfig } = await import('@graphql/queries/videoCalls/VideoCallConfig.gql')
const { default: VideoCallParticipantCount } =
  await import('@graphql/queries/videoCalls/VideoCallParticipantCount.gql')
const { createApolloTestSetup } = await import('@root/test/helpers')
const {
  default: videoCallResolvers,
  assertGroupMembershipCached,
  getLiveParticipantCount,
  groupIdFromRoomName,
  roomNameForGroup,
} = await import('./videoCalls')

const ENABLED_LIVEKIT = {
  LIVEKIT_URL: 'wss://livekit.example.test',
  LIVEKIT_API_KEY: 'test-key',
  LIVEKIT_API_SECRET: 'test-secret',
  LIVEKIT_ENABLED: true,
}

// Group has a Joi `min: 100` constraint on `description`; faker.lorem.paragraphs
// can fall under that under unlucky seeds, which surfaces as ERROR_VALIDATION.
// Pass an explicit, comfortably-over-100-chars description for every Group we
// build so the spec is deterministic regardless of faker output.
const DESCRIPTION_OVERRIDE = {
  description:
    'A descriptive paragraph for video-call test groups that is comfortably longer than the 100 character minimum required by the Group model schema.',
}

let authenticatedUser: Context['user']
let livekitConfig: Record<string, unknown> = {}
// Per-test role override: tweaks the viewer's effective permissions to test the
// per-group-type open gate (videoCall.create_public / _closed / _hidden).
let rolesOverride: RoleDefinition[] | undefined
// videoConference's effective value (the single switch the resolvers now read) folds
// the LiveKit env via requiresEnv, so feed the same LiveKit vars as the policy env:
// ENABLED_LIVEKIT → videoConference available + on; {} → unavailable → off.
const context = () => ({
  authenticatedUser,
  config: livekitConfig,
  env: livekitConfig as Record<string, string | undefined>,
  roles: rolesOverride,
})
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
let memberJson: Context['user']
let outsiderJson: Context['user']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
})

beforeEach(async () => {
  await cleanDatabase()
  listParticipantsMock = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue([])
  livekitConfig = {}
  authenticatedUser = null
  rolesOverride = undefined
  const [member, outsider] = await Promise.all([
    Factory.build('user', { id: 'member-1', name: 'Member' }),
    Factory.build('user', { id: 'outsider-1', name: 'Outsider' }),
  ])
  ;[memberJson, outsiderJson] = await Promise.all([member.toJson(), outsider.toJson()])
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe('roomNameForGroup / groupIdFromRoomName', () => {
  it('encodes and decodes group ids in the room name', () => {
    expect(roomNameForGroup('abc-123')).toBe('group-abc-123')
    expect(groupIdFromRoomName('group-abc-123')).toBe('abc-123')
    expect(groupIdFromRoomName('something-else')).toBeNull()
    expect(groupIdFromRoomName(null)).toBeNull()
    expect(groupIdFromRoomName(undefined)).toBeNull()
  })
})

describe('videoCallConfig', () => {
  it('reports enabled=false when LiveKit is not configured', async () => {
    livekitConfig = {}
    const { data, errors } = await query({ query: VideoCallConfig })

    expect(errors).toBeUndefined()
    expect(data.videoCallConfig.enabled).toBe(false)
  })

  it('reports enabled=true when LiveKit is configured', async () => {
    livekitConfig = ENABLED_LIVEKIT
    const { data, errors } = await query({ query: VideoCallConfig })

    expect(errors).toBeUndefined()
    expect(data.videoCallConfig.enabled).toBe(true)
  })
})

describe('videoCallParticipantCount', () => {
  it('throws when LiveKit is disabled', async () => {
    authenticatedUser = memberJson
    await Factory.build(
      'group',
      { id: 'pub-1', groupType: 'public', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { errors } = await query({
      query: VideoCallParticipantCount,
      variables: { groupId: 'pub-1' },
    })

    expect(errors?.[0].message).toMatch(/disabled/i)
  })

  it('throws when user is not a member of the group', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = outsiderJson
    await Factory.build(
      'group',
      { id: 'pub-1', groupType: 'public', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { errors } = await query({
      query: VideoCallParticipantCount,
      variables: { groupId: 'pub-1' },
    })

    expect(errors?.[0].message).toMatch(/not a member/i)
  })

  it('returns the count for a member of a non-public (closed) group', async () => {
    // Video calls are available in every group type now; viewing the count only
    // needs membership (opening is gated separately on the mutation).
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    await Factory.build(
      'group',
      { id: 'cl-1', groupType: 'closed', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    listParticipantsMock.mockResolvedValueOnce([{}, {}])
    const { data, errors } = await query({
      query: VideoCallParticipantCount,
      variables: { groupId: 'cl-1' },
    })

    expect(errors).toBeUndefined()
    expect(data.videoCallParticipantCount).toBe(2)
  })

  it('returns the participant count for a public group member', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    await Factory.build(
      'group',
      { id: 'pub-1', groupType: 'public', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    listParticipantsMock.mockResolvedValueOnce([{}, {}, {}])
    const { data, errors } = await query({
      query: VideoCallParticipantCount,
      variables: { groupId: 'pub-1' },
    })

    expect(errors).toBeUndefined()
    expect(data.videoCallParticipantCount).toBe(3)
    expect(listParticipantsMock).toHaveBeenCalledWith('group-pub-1')
  })

  it('returns 0 if LiveKit reports the room does not exist', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    await Factory.build(
      'group',
      { id: 'pub-1', groupType: 'public', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    listParticipantsMock.mockRejectedValueOnce(
      new TwirpError('Not Found', 'room not found', 404, 'not_found'),
    )
    const { data, errors } = await query({
      query: VideoCallParticipantCount,
      variables: { groupId: 'pub-1' },
    })

    expect(errors).toBeUndefined()
    expect(data.videoCallParticipantCount).toBe(0)
  })

  it('surfaces non-404 LiveKit errors instead of silently returning 0', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    await Factory.build(
      'group',
      { id: 'pub-1', groupType: 'public', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    listParticipantsMock.mockRejectedValueOnce(
      new TwirpError('Internal', 'upstream boom', 500, 'internal'),
    )
    const { data, errors } = await query({
      query: VideoCallParticipantCount,
      variables: { groupId: 'pub-1' },
    })

    // The error must originate from our LiveKit listParticipants call, not
    // from an unrelated path (auth/feature-flag/group-type). Assert on the
    // underlying TwirpError message + an empty data payload so we never
    // accept a different error class as a passing test.
    expect(errors).toHaveLength(1)
    expect(errors?.[0].message).toMatch(/upstream boom/i)
    // No participant count was returned — the field failed instead of
    // silently degrading to 0.
    expect(data?.videoCallParticipantCount).toBeFalsy()
    expect(listParticipantsMock).toHaveBeenCalledWith('group-pub-1')
  })
})

describe('joinGroupVideoCall', () => {
  it('throws when disabled', async () => {
    authenticatedUser = memberJson
    await Factory.build(
      'group',
      { id: 'pub-1', groupType: 'public', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'pub-1' },
    })

    expect(errors?.[0].message).toMatch(/disabled/i)
  })

  it('throws for non-members', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = outsiderJson
    await Factory.build(
      'group',
      { id: 'pub-1', groupType: 'public', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'pub-1' },
    })

    expect(errors?.[0].message).toMatch(/not a member/i)
  })

  it('denies OPENING a hidden-group call without videoCall.create_hidden (baseline user)', async () => {
    // No live participants (default mock → []), so this is an OPEN. The baseline user
    // holds videoCall.create_public but not _hidden → denied for a hidden group.
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    await Factory.build(
      'group',
      { id: 'h-1', groupType: 'hidden', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'h-1' },
    })

    expect(errors?.[0].message).toMatch(/may not start a video call/i)
  })

  it('allows JOINING an existing hidden-group call without the open permission', async () => {
    // A call is already running (participants > 0) → this is a JOIN, which any member
    // may do regardless of the per-type open permission.
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    await Factory.build(
      'group',
      { id: 'h-1', groupType: 'hidden', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    listParticipantsMock.mockResolvedValueOnce([{}, {}])
    const { data, errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'h-1' },
    })

    expect(errors).toBeUndefined()
    expect(data.joinGroupVideoCall.roomName).toBe('group-h-1')
    expect(data.joinGroupVideoCall.token).toContain('member-1')
  })

  it('denies OPENING a public-group call when the role lacks videoCall.create_public', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    rolesOverride = [
      { name: 'user', protected: false, permissions: ['post.create', 'comment.create'] },
    ]
    await Factory.build(
      'group',
      { id: 'pub-1', groupType: 'public', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'pub-1' },
    })

    expect(errors?.[0].message).toMatch(/may not start a video call/i)
  })

  it('allows OPENING a hidden-group call when the role holds videoCall.create_hidden', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    rolesOverride = [{ name: 'user', protected: false, permissions: ['videoCall.create_hidden'] }]
    await Factory.build(
      'group',
      { id: 'h-1', groupType: 'hidden', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { data, errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'h-1' },
    })

    expect(errors).toBeUndefined()
    expect(data.joinGroupVideoCall.roomName).toBe('group-h-1')
  })

  it('denies OPENING a closed-group call when the role lacks videoCall.create_closed', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    rolesOverride = [
      { name: 'user', protected: false, permissions: ['post.create', 'comment.create'] },
    ]
    await Factory.build(
      'group',
      { id: 'cl-1', groupType: 'closed', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'cl-1' },
    })

    expect(errors?.[0].message).toMatch(/may not start a video call/i)
  })

  it('allows OPENING a closed-group call when the role holds videoCall.create_closed', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    rolesOverride = [{ name: 'user', protected: false, permissions: ['videoCall.create_closed'] }]
    await Factory.build(
      'group',
      { id: 'cl-1', groupType: 'closed', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { data, errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'cl-1' },
    })

    expect(errors).toBeUndefined()
    expect(data.joinGroupVideoCall.roomName).toBe('group-cl-1')
  })

  it('returns token, url and deterministic room name when OPENING a public-group call (baseline user)', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    await Factory.build(
      'group',
      { id: 'pub-1', groupType: 'public', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { data, errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'pub-1' },
    })

    expect(errors).toBeUndefined()
    expect(data.joinGroupVideoCall.url).toBe('wss://livekit.example.test')
    expect(data.joinGroupVideoCall.roomName).toBe('group-pub-1')
    expect(typeof data.joinGroupVideoCall.token).toBe('string')
    expect(data.joinGroupVideoCall.token).toContain('member-1')
    expect(data.joinGroupVideoCall.token).toContain('group-pub-1')
  })

  it('refuses to OPEN a call in a group whose type has no open permission', async () => {
    // Fail closed on an unmapped group type: if a new type is ever added without
    // extending openPermissionForGroupType, nobody may open a call there — the
    // alternative (falling through) would let everybody open one unchecked.
    // The role below holds ALL three open permissions, so only the missing mapping
    // can produce the rejection.
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    rolesOverride = [
      {
        name: 'user',
        protected: false,
        permissions: [
          'videoCall.create_public',
          'videoCall.create_closed',
          'videoCall.create_hidden',
        ],
      },
    ]
    await Factory.build(
      'group',
      { id: 'exp-1', groupType: 'public', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    // Written past the model validation on purpose — this mirrors a future group type
    // reaching the resolver before the permission map knows about it.
    await database.write({
      query: `MATCH (g:Group { id: 'exp-1' }) SET g.groupType = 'experimental'`,
      variables: {},
    })

    const { errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'exp-1' },
    })

    expect(errors?.[0].message).toMatch(/may not start a video call/i)
  })

  describe('access token metadata', () => {
    // The token metadata is broadcast to every other participant and is the only
    // source the frontend has for a remote tile's avatar. A wrong/missing payload
    // silently degrades every remote tile to initials.
    const lastAccessTokenOptions = () =>
      vi.mocked(AccessToken).mock.calls.at(-1)?.[2] as { identity: string; metadata: string }

    it('carries the joining user id and avatar url', async () => {
      livekitConfig = ENABLED_LIVEKIT
      authenticatedUser = memberJson
      await Factory.build(
        'group',
        { id: 'meta-1', groupType: 'public', ...DESCRIPTION_OVERRIDE },
        { ownerId: 'member-1' },
      )

      const { errors } = await mutate({
        mutation: JoinGroupVideoCall,
        variables: { groupId: 'meta-1' },
      })

      expect(errors).toBeUndefined()

      const metadata = JSON.parse(lastAccessTokenOptions().metadata) as {
        userId: string
        avatarUrl: string | null
      }

      expect(metadata.userId).toBe('member-1')
      expect(metadata.avatarUrl).toEqual(expect.stringContaining('http'))
    })

    it('carries a null avatar url for a user without an avatar image', async () => {
      livekitConfig = ENABLED_LIVEKIT
      const bare = await Factory.build('user', { id: 'bare-1', name: 'Bare' }, { avatar: null })
      authenticatedUser = await bare.toJson()
      await Factory.build(
        'group',
        { id: 'meta-2', groupType: 'public', ...DESCRIPTION_OVERRIDE },
        { ownerId: 'bare-1' },
      )

      const { errors } = await mutate({
        mutation: JoinGroupVideoCall,
        variables: { groupId: 'meta-2' },
      })

      expect(errors).toBeUndefined()
      // `null`, not `undefined` — JSON.stringify would drop an undefined key entirely
      // and the client could not tell "no avatar" from "field missing".
      expect(JSON.parse(lastAccessTokenOptions().metadata)).toEqual({
        userId: 'bare-1',
        avatarUrl: null,
      })
    })

    it('suffixes the identity so one user can join from several devices', async () => {
      // LiveKit treats `identity` as a room-unique key: two connections sharing one
      // would kick each other out, so the same user joining twice must differ.
      livekitConfig = ENABLED_LIVEKIT
      authenticatedUser = memberJson
      await Factory.build(
        'group',
        { id: 'meta-3', groupType: 'public', ...DESCRIPTION_OVERRIDE },
        { ownerId: 'member-1' },
      )

      await mutate({ mutation: JoinGroupVideoCall, variables: { groupId: 'meta-3' } })
      const first = lastAccessTokenOptions().identity
      await mutate({ mutation: JoinGroupVideoCall, variables: { groupId: 'meta-3' } })
      const second = lastAccessTokenOptions().identity

      expect(first).toMatch(/^member-1#[0-9a-f]{8}$/)
      expect(second).toMatch(/^member-1#[0-9a-f]{8}$/)
      expect(second).not.toBe(first)
    })
  })
})

describe('getLiveParticipantCount', () => {
  // LIVEKIT_URL is the *client* (WebSocket) url. RoomServiceClient speaks HTTP, so the
  // scheme has to be rewritten before it is handed over — a ws(s):// url makes every
  // server-side LiveKit call fail, which would surface as "the room is always empty".
  it.each([
    ['wss://livekit.example.test', 'https://livekit.example.test'],
    ['ws://livekit.example.test:7880', 'http://livekit.example.test:7880'],
    ['https://livekit.example.test', 'https://livekit.example.test'],
  ])('reaches %s over %s', async (livekitUrl, expectedHttpUrl) => {
    listParticipantsMock.mockResolvedValueOnce([{}, {}])

    const count = await getLiveParticipantCount(
      { LIVEKIT_URL: livekitUrl, LIVEKIT_API_KEY: 'k', LIVEKIT_API_SECRET: 's' },
      'group-url-1',
    )

    expect(count).toBe(2)
    expect(vi.mocked(RoomServiceClient).mock.calls.at(-1)).toEqual([expectedHttpUrl, 'k', 's'])
  })
})

describe('assertGroupMembershipCached', () => {
  it('rejects a non-member and does not cache the rejection', async () => {
    await Factory.build(
      'group',
      { id: 'cache-1', groupType: 'closed', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )

    await expect(
      assertGroupMembershipCached(database.driver, 'cache-1', 'outsider-1'),
    ).resolves.toBe(false)

    // Joining has to take effect at once: a cached "no" would lock a fresh member out
    // of the participant-count stream for the whole TTL.
    await database.write({
      query: `MATCH (u:User { id: 'outsider-1' }), (g:Group { id: 'cache-1' })
              MERGE (u)-[m:MEMBER_OF]->(g)
              SET m.role = 'usual'`,
      variables: {},
    })

    await expect(
      assertGroupMembershipCached(database.driver, 'cache-1', 'outsider-1'),
    ).resolves.toBe(true)
  })

  it('serves repeat checks from the cache but re-reads once the TTL has passed', async () => {
    await Factory.build(
      'group',
      { id: 'cache-2', groupType: 'closed', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )

    await expect(assertGroupMembershipCached(database.driver, 'cache-2', 'member-1')).resolves.toBe(
      true,
    )

    await database.write({
      query: `MATCH (:User { id: 'member-1' })-[m:MEMBER_OF]->(:Group { id: 'cache-2' })
              DELETE m`,
      variables: {},
    })

    // Still true inside the window — the cache exists to keep the poll-driven filter
    // from firing one Neo4j read per event × subscriber.
    await expect(assertGroupMembershipCached(database.driver, 'cache-2', 'member-1')).resolves.toBe(
      true,
    )

    // …but the stale positive must not outlive the window, or a removed member would
    // keep receiving the group's participant-count events forever.
    const expiredNow = Date.now() + 31_000
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(expiredNow)
    try {
      await expect(
        assertGroupMembershipCached(database.driver, 'cache-2', 'member-1'),
      ).resolves.toBe(false)
    } finally {
      nowSpy.mockRestore()
    }
  })
})

describe('Subscription.videoCallParticipantCountChanged', () => {
  const subscription = videoCallResolvers.Subscription.videoCallParticipantCountChanged

  // Subscriptions bypass the Apollo request pipeline (and therefore the shield rules),
  // so this filter is the ONLY authorization boundary in front of the event stream.
  const subscriptionSetup = (user: Context['user']) => {
    const pubsub = new PubSub()
    return {
      pubsub,
      context: { pubsub, user, driver: database.driver } as unknown as Context,
    }
  }

  const publish = async (pubsub: PubSub, groupId: string, count: number) =>
    pubsub.publish(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED, { groupId, count })

  // A filtered-out event simply never resolves `next()`, so the negative assertions
  // have to be bounded. The filter's slowest path is a single Neo4j read; anything
  // still missing after this window was dropped by the filter, not merely slow.
  const FILTER_DROP_TIMEOUT_MS = 2000
  const DROPPED = Symbol('dropped')
  interface CountPayload {
    groupId: string
    count: number
  }
  const awaitDelivery = async (next: Promise<IteratorResult<CountPayload>>) =>
    Promise.race([next, delay(FILTER_DROP_TIMEOUT_MS, DROPPED, { ref: false })])
  const payloadOf = (delivered: IteratorResult<CountPayload> | typeof DROPPED) =>
    subscription.resolve((delivered as IteratorYieldResult<CountPayload>).value)

  it('delivers the count to a member of the addressed group', async () => {
    await Factory.build(
      'group',
      { id: 'sub-1', groupType: 'closed', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { pubsub, context: subscriber } = subscriptionSetup(memberJson)
    const iterator = subscription.subscribe(null, { groupId: 'sub-1' }, subscriber, null)
    const next = iterator.next()

    await publish(pubsub, 'sub-1', 4)

    const delivered = await awaitDelivery(next)

    expect(delivered).not.toBe(DROPPED)
    expect(payloadOf(delivered)).toEqual({ groupId: 'sub-1', count: 4 })
  })

  it('drops an event that belongs to another group', async () => {
    // Every subscriber on the process shares one channel, so without the groupId check
    // a call in group B would be broadcast to everybody watching group A.
    await Promise.all([
      Factory.build(
        'group',
        { id: 'sub-2a', groupType: 'closed', ...DESCRIPTION_OVERRIDE },
        { ownerId: 'member-1' },
      ),
      Factory.build(
        'group',
        { id: 'sub-2b', groupType: 'closed', ...DESCRIPTION_OVERRIDE },
        { ownerId: 'member-1' },
      ),
    ])
    const { pubsub, context: subscriber } = subscriptionSetup(memberJson)
    const iterator = subscription.subscribe(null, { groupId: 'sub-2a' }, subscriber, null)
    const next = iterator.next()

    // The filter runs strictly in publish order, so the delivered event being the
    // second one proves the first was dropped rather than queued behind it.
    await publish(pubsub, 'sub-2b', 7)
    await publish(pubsub, 'sub-2a', 9)

    const delivered = await awaitDelivery(next)

    expect(payloadOf(delivered)).toEqual({ groupId: 'sub-2a', count: 9 })
  })

  it('drops every event for an unauthenticated subscriber', async () => {
    await Factory.build(
      'group',
      { id: 'sub-3', groupType: 'public', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { pubsub, context: subscriber } = subscriptionSetup(null)
    const iterator = subscription.subscribe(null, { groupId: 'sub-3' }, subscriber, null)
    const next = iterator.next()

    await publish(pubsub, 'sub-3', 2)

    expect(await awaitDelivery(next)).toBe(DROPPED)
  })

  it('drops every event for a subscriber who is not a member of the group', async () => {
    // Group ids are guessable, so an outsider could otherwise learn when and how
    // busy a (hidden) group's call is just by subscribing.
    await Factory.build(
      'group',
      { id: 'sub-4', groupType: 'hidden', ...DESCRIPTION_OVERRIDE },
      { ownerId: 'member-1' },
    )
    const { pubsub, context: subscriber } = subscriptionSetup(outsiderJson)
    const iterator = subscription.subscribe(null, { groupId: 'sub-4' }, subscriber, null)
    const next = iterator.next()

    await publish(pubsub, 'sub-4', 3)

    expect(await awaitDelivery(next)).toBe(DROPPED)
  })
})
