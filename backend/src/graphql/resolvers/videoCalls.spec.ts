/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */


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
    RoomServiceClient: vi.fn().mockImplementation(() => ({
      listParticipants: async (roomName: string) => listParticipantsMock(roomName),
    })),
    TwirpError: MockTwirpError,
    WebhookReceiver: vi.fn(),
  }
})

// Imported after the mock registrations, not above them: `unstable_mockModule`
// does not hoist, so a static import would bind the real module first.
const { TwirpError } = await import('livekit-server-sdk')
const { default: Factory, cleanDatabase } = await import('@db/factories')
const { default: JoinGroupVideoCall } =
  await import('@graphql/queries/videoCalls/JoinGroupVideoCall.gql')
const { default: VideoCallConfig } = await import('@graphql/queries/videoCalls/VideoCallConfig.gql')
const { default: VideoCallParticipantCount } =
  await import('@graphql/queries/videoCalls/VideoCallParticipantCount.gql')
const { createApolloTestSetup } = await import('@root/test/helpers')
const { groupIdFromRoomName, roomNameForGroup } = await import('./videoCalls')

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
})
