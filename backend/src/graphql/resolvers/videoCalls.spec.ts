/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import Factory, { cleanDatabase } from '@db/factories'
import JoinGroupVideoCall from '@graphql/queries/videoCalls/JoinGroupVideoCall.gql'
import VideoCallConfig from '@graphql/queries/videoCalls/VideoCallConfig.gql'
import VideoCallParticipantCount from '@graphql/queries/videoCalls/VideoCallParticipantCount.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import { groupIdFromRoomName, roomNameForGroup } from './videoCalls'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let listParticipantsMock = jest.fn()

jest.mock('livekit-server-sdk', () => {
  return {
    AccessToken: jest.fn().mockImplementation((apiKey: string, _apiSecret: string, opts) => {
      const grants: Record<string, unknown> = {}
      return {
        addGrant: (g: Record<string, unknown>) => Object.assign(grants, g),
        toJwt: async () =>
          Promise.resolve(
            `mocked-jwt.${apiKey}.${(opts as { identity: string }).identity}.${(grants as { room?: string }).room ?? ''}`,
          ),
      }
    }),
    RoomServiceClient: jest.fn().mockImplementation(() => ({
      listParticipants: (roomName: string) => listParticipantsMock(roomName),
    })),
    WebhookReceiver: jest.fn(),
  }
})

const ENABLED_LIVEKIT = {
  LIVEKIT_URL: 'wss://livekit.example.test',
  LIVEKIT_API_KEY: 'test-key',
  LIVEKIT_API_SECRET: 'test-secret',
  LIVEKIT_ENABLED: true,
}

let authenticatedUser: Context['user']
let livekitConfig: Record<string, unknown> = {}
const context = () => ({ authenticatedUser, config: livekitConfig })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
let memberJson, outsiderJson

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
  listParticipantsMock = jest.fn().mockResolvedValue([])
  livekitConfig = {}
  authenticatedUser = null
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
    await Factory.build('group', { id: 'pub-1', groupType: 'public' }, { ownerId: 'member-1' })
    const { errors } = await query({
      query: VideoCallParticipantCount,
      variables: { groupId: 'pub-1' },
    })
    expect(errors?.[0].message).toMatch(/disabled/i)
  })

  it('throws when user is not a member of the group', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = outsiderJson
    await Factory.build('group', { id: 'pub-1', groupType: 'public' }, { ownerId: 'member-1' })
    const { errors } = await query({
      query: VideoCallParticipantCount,
      variables: { groupId: 'pub-1' },
    })
    expect(errors?.[0].message).toMatch(/not a member/i)
  })

  it('throws when group is closed (not public)', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    await Factory.build('group', { id: 'cl-1', groupType: 'closed' }, { ownerId: 'member-1' })
    const { errors } = await query({
      query: VideoCallParticipantCount,
      variables: { groupId: 'cl-1' },
    })
    expect(errors?.[0].message).toMatch(/only available for public groups/i)
  })

  it('returns the participant count for a public group member', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    await Factory.build('group', { id: 'pub-1', groupType: 'public' }, { ownerId: 'member-1' })
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
    await Factory.build('group', { id: 'pub-1', groupType: 'public' }, { ownerId: 'member-1' })
    listParticipantsMock.mockRejectedValueOnce(new Error('room not found'))
    const { data, errors } = await query({
      query: VideoCallParticipantCount,
      variables: { groupId: 'pub-1' },
    })
    expect(errors).toBeUndefined()
    expect(data.videoCallParticipantCount).toBe(0)
  })
})

describe('joinGroupVideoCall', () => {
  it('throws when disabled', async () => {
    authenticatedUser = memberJson
    await Factory.build('group', { id: 'pub-1', groupType: 'public' }, { ownerId: 'member-1' })
    const { errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'pub-1' },
    })
    expect(errors?.[0].message).toMatch(/disabled/i)
  })

  it('throws for non-members', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = outsiderJson
    await Factory.build('group', { id: 'pub-1', groupType: 'public' }, { ownerId: 'member-1' })
    const { errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'pub-1' },
    })
    expect(errors?.[0].message).toMatch(/not a member/i)
  })

  it('throws for non-public groups', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    await Factory.build('group', { id: 'h-1', groupType: 'hidden' }, { ownerId: 'member-1' })
    const { errors } = await mutate({
      mutation: JoinGroupVideoCall,
      variables: { groupId: 'h-1' },
    })
    expect(errors?.[0].message).toMatch(/only available for public groups/i)
  })

  it('returns token, url and deterministic room name for a public-group member', async () => {
    livekitConfig = ENABLED_LIVEKIT
    authenticatedUser = memberJson
    await Factory.build('group', { id: 'pub-1', groupType: 'public' }, { ownerId: 'member-1' })
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
