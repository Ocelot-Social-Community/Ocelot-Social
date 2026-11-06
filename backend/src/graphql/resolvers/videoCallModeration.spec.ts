/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

interface Participant {
  identity: string
  metadata: string
  joinedAt: bigint
  tracks: { sid: string; source: number; muted: boolean }[]
}

let participants: Participant[] = []
const room = {
  listParticipants: vi.fn(async () => Promise.resolve(participants)),
  listRooms: vi.fn(async () => Promise.resolve([{ name: 'group-g1', sid: 'RM_1' }])),
  mutePublishedTrack: vi.fn(async () => Promise.resolve({})),
  removeParticipant: vi.fn(async () => Promise.resolve(undefined)),
  updateRoomMetadata: vi.fn(async () => Promise.resolve({})),
  sendData: vi.fn(async () => Promise.resolve(undefined)),
}

vi.mock('livekit-server-sdk', async (importOriginal) => {
  const original: Record<string, unknown> = await importOriginal()
  return {
    ...original,
    // `function`, not an arrow: the code under test constructs it.
    RoomServiceClient: vi.fn().mockImplementation(function () {
      return room
    }),
  }
})

const { TrackSource } = await import('livekit-server-sdk')
const { default: Factory, cleanDatabase } = await import('@db/factories')
const { createApolloTestSetup } = await import('@root/test/helpers')
const { joinCallSession } = await import('@src/livekit/callSession')
const { readModeration, setEveryoneModerates, setModerator, markRemoved } =
  await import('@src/livekit/moderation')
const { standing } = await import('./videoCallModeration')
const q = async (name: string) => (await import(`@graphql/queries/videoCalls/${name}.gql`)).default
const [
  Moderate,
  MuteAll,
  SetModerator,
  SetEveryone,
  TakeOver,
  SetFloor,
  HandOver,
  Rights,
  Successor,
  JoinGroupVideoCall,
] = await Promise.all(
  [
    'ModerateVideoCallParticipant',
    'MuteAllInVideoCall',
    'SetVideoCallModerator',
    'SetVideoCallEveryoneModerates',
    'TakeOverVideoCallModeration',
    'SetVideoCallFloor',
    'HandOverVideoCallModeration',
    'VideoCallModerationRights',
    'VideoCallModerationSuccessor',
    'JoinGroupVideoCall',
  ].map(q),
)

const LIVEKIT = {
  LIVEKIT_URL: 'wss://livekit.example.test',
  LIVEKIT_API_KEY: 'test-key',
  LIVEKIT_API_SECRET: 'test-secret',
  LIVEKIT_ENABLED: true,
}

let authenticatedUser: Context['user']
const users: Record<string, Context['user']> = {}
const context = () => ({
  authenticatedUser,
  config: LIVEKIT,
  env: LIVEKIT as unknown as Record<string, string | undefined>,
})
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const as = (userId: string) => {
  authenticatedUser = users[userId]
}

// Who the media server lists in the call: each with a microphone, a camera and a screen share
// that are on.
const inCall = (...userIds: string[]) => {
  participants = userIds.map((userId, index) => ({
    identity: `${userId}#1`,
    metadata: JSON.stringify({ userId }),
    joinedAt: BigInt(index + 1),
    tracks: [
      { sid: `${userId}-mic`, source: TrackSource.MICROPHONE, muted: false },
      { sid: `${userId}-cam`, source: TrackSource.CAMERA, muted: false },
      { sid: `${userId}-screen`, source: TrackSource.SCREEN_SHARE, muted: false },
    ],
  }))
}

// The call's session, opened by its starter as joining its chat does.
const open = async (starter: string) => {
  await joinCallSession(database.driver, {
    groupId: 'g1',
    userId: starter,
    livekitRoom: 'group-g1',
    livekitSid: 'RM_1',
    presentUserIds: participants.map(({ metadata }) => JSON.parse(metadata).userId as string),
  })
  return (await readModeration(database.driver, 'g1'))?.sessionId as string
}

const state = async () => readModeration(database.driver, 'g1')

// What was told to whom, as { type, to } with the user ids of the destinations (or 'all').
const told = () =>
  room.sendData.mock.calls.map((call) => {
    const [, data, , options] = call as unknown as [
      string,
      Uint8Array,
      number,
      { destinationIdentities?: string[] },
    ]
    return {
      ...(JSON.parse(new TextDecoder().decode(data)) as { type: string }),
      to: options.destinationIdentities?.map((identity) => identity.split('#')[0]) ?? 'all',
    }
  })

const setSpeakersFor = async (sessionId: string, userIds: string[]) => {
  const { setSpeakers } = await import('@src/livekit/moderation')
  await setSpeakers(database.driver, sessionId, userIds)
}

const errorOf = (result: { errors?: readonly { message: string }[] }) => result.errors?.[0]?.message

beforeAll(async () => {
  await cleanDatabase()
  const setup = await createApolloTestSetup({ context })
  mutate = setup.mutate
  query = setup.query
  database = setup.database
  server = setup.server
})

beforeEach(async () => {
  vi.clearAllMocks()
  participants = []
  await cleanDatabase()
  for (const [id, name] of [
    ['olga', 'Olga'],
    ['adam', 'Adam'],
    ['ute', 'Ute'],
    ['udo', 'Udo'],
  ]) {
    users[id] = await (await Factory.build('user', { id, name })).toJson()
  }
  await Factory.build(
    'group',
    {
      id: 'g1',
      template: 'public',
      description:
        'A descriptive paragraph for the moderation test group that is comfortably longer than the 100 characters the model asks for.',
    },
    { ownerId: 'olga' },
  )
  await database.write({
    query: `
      MATCH (g:Group { id: 'g1' })
      UNWIND $members AS member
      MATCH (u:User { id: member.id })
      MERGE (u)-[m:MEMBER_OF]->(g)
      SET m.role = member.role, m.createdAt = toString(datetime()), m.updatedAt = toString(datetime())
    `,
    variables: {
      members: [
        { id: 'adam', role: 'admin' },
        { id: 'ute', role: 'usual' },
        { id: 'udo', role: 'usual' },
      ],
    },
  })
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe('taking part', () => {
  it('only somebody in the call may act on it', async () => {
    inCall('ute')
    await open('ute')
    as('udo')

    expect(errorOf(await query({ query: Successor, variables: { groupId: 'g1' } }))).toBe(
      'Only those taking part in the video call can moderate it.',
    )
  })

  it('needs the session to be open', async () => {
    inCall('ute')
    as('ute')

    expect(errorOf(await query({ query: Successor, variables: { groupId: 'g1' } }))).toBe(
      'Only those taking part in the video call can moderate it.',
    )
  })
})

describe('videoCallModerationRights', () => {
  const rights = async (userId: string) =>
    (await query({ query: Rights, variables: { groupId: 'g1', userId } })).data
      ?.videoCallModerationRights

  it('grants nothing over oneself, nobody absent, or to one who does not moderate', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('ute')

    expect(await rights('ute')).toEqual({ userId: 'ute', remove: false, revokeModeration: false })
    expect(await rights('adam')).toEqual({ userId: 'adam', remove: false, revokeModeration: false })

    as('udo')

    expect(await rights('ute')).toEqual({ userId: 'ute', remove: false, revokeModeration: false })
  })

  it('lets a moderator remove a peer, but neither remove nor revoke a moderating peer', async () => {
    inCall('ute', 'udo')
    const sessionId = await open('ute')
    as('ute')

    expect(await rights('udo')).toEqual({ userId: 'udo', remove: true, revokeModeration: false })

    await setModerator(database.driver, sessionId, 'udo', { moderator: true })

    expect(await rights('udo')).toEqual({ userId: 'udo', remove: false, revokeModeration: false })
  })

  it('lets somebody above remove and revoke, and nobody remove the owner', async () => {
    inCall('adam', 'ute', 'olga')
    const sessionId = await open('adam')
    await setModerator(database.driver, sessionId, 'ute', { moderator: true })
    as('adam')

    expect(await rights('ute')).toEqual({ userId: 'ute', remove: true, revokeModeration: true })
    expect(await rights('olga')).toEqual({ userId: 'olga', remove: false, revokeModeration: false })
  })
})

describe('videoCallModerationSuccessor', () => {
  it('names who would get it, passing over oneself, the removed and the revoked', async () => {
    inCall('ute', 'udo', 'adam')
    const sessionId = await open('ute')
    as('ute')
    const successor = async () =>
      (await query({ query: Successor, variables: { groupId: 'g1' } })).data
        ?.videoCallModerationSuccessor

    expect(await successor()).toBe('adam')

    await markRemoved(database.driver, sessionId, 'adam')

    expect(await successor()).toBe('udo')

    await setModerator(database.driver, sessionId, 'udo', { moderator: false, revoked: true })

    // Nobody else left: a revoked one all the same.
    expect(await successor()).toBe('udo')
  })
})

describe('moderateVideoCallParticipant', () => {
  const moderate = async (userId: string, action: string) =>
    mutate({ mutation: Moderate, variables: { groupId: 'g1', userId, action } })

  it('is for moderators, and for people in the call', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('udo')

    expect(errorOf(await moderate('ute', 'MUTE_MICROPHONE'))).toBe(
      'Only a moderator of the video call can do this.',
    )

    as('ute')

    expect(errorOf(await moderate('adam', 'MUTE_MICROPHONE'))).toBe(
      'They are not in the video call.',
    )
  })

  it('mutes, switches off and ends a share, and says who did it', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('ute')

    expect((await moderate('udo', 'MUTE_MICROPHONE')).data?.moderateVideoCallParticipant).toBe(true)

    await moderate('udo', 'DISABLE_CAMERA')
    await moderate('udo', 'STOP_SCREEN_SHARE')

    expect(room.mutePublishedTrack.mock.calls.map((call) => (call as unknown[])[2])).toEqual([
      'udo-mic',
      'udo-cam',
      'udo-screen',
    ])
    expect(told()).toEqual([
      { type: 'microphoneMuted', by: 'Ute', to: ['udo'] },
      { type: 'cameraOff', by: 'Ute', to: ['udo'] },
      { type: 'screenShareStopped', by: 'Ute', to: ['udo'] },
    ])
  })

  it('reaches somebody above, and tells nobody when it is oneself', async () => {
    inCall('ute', 'olga')
    await open('ute')
    as('ute')
    await moderate('olga', 'MUTE_MICROPHONE')
    await moderate('ute', 'MUTE_MICROPHONE')

    expect(room.mutePublishedTrack).toHaveBeenCalledTimes(2)
    expect(told()).toEqual([{ type: 'microphoneMuted', by: 'Ute', to: ['olga'] }])
  })

  it('removes a peer, who cannot join again while the call lasts', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('ute')

    expect((await moderate('udo', 'REMOVE')).data?.moderateVideoCallParticipant).toBe(true)
    expect(room.removeParticipant).toHaveBeenCalledWith('group-g1', 'udo#1')
    expect(told()).toEqual([{ type: 'removed', by: 'Ute', to: ['udo'] }])
    expect((await state())?.removedIds).toEqual(['udo'])

    as('udo')

    expect(
      errorOf(await mutate({ mutation: JoinGroupVideoCall, variables: { groupId: 'g1' } })),
    ).toBe('You were removed from this video call. You can join the next one.')

    // Anybody else still gets in.
    as('adam')

    expect(
      (await mutate({ mutation: JoinGroupVideoCall, variables: { groupId: 'g1' } })).errors,
    ).toBeUndefined()
  })

  it('removes neither oneself, nor the owner, nor somebody above, nor a moderating peer', async () => {
    inCall('ute', 'udo', 'olga', 'adam')
    const sessionId = await open('ute')
    await setModerator(database.driver, sessionId, 'udo', { moderator: true })
    as('ute')
    const outranked = 'You do not rank high enough in the group to do this to them.'

    expect(errorOf(await moderate('ute', 'REMOVE'))).toBe(outranked)
    expect(errorOf(await moderate('olga', 'REMOVE'))).toBe(
      'The owner of the group cannot be removed from its video call.',
    )
    expect(errorOf(await moderate('adam', 'REMOVE'))).toBe(outranked)
    expect(errorOf(await moderate('udo', 'REMOVE'))).toBe(outranked)
    expect(room.removeParticipant).not.toHaveBeenCalled()
  })
})

describe('muteAllInVideoCall', () => {
  it('mutes everybody not spared, gives the floor and says so to the new speakers', async () => {
    inCall('ute', 'udo', 'adam', 'olga')
    const sessionId = await open('ute')
    await setSpeakersFor(sessionId, ['olga'])
    as('ute')
    const result = await mutate({
      mutation: MuteAll,
      variables: {
        groupId: 'g1',
        exceptUserIds: ['ute'],
        floorUserIds: ['adam', 'olga', 'ute', 'gone'],
      },
    })

    expect(result.data?.muteAllInVideoCall).toBe(1)
    expect(room.mutePublishedTrack.mock.calls.map((call) => (call as unknown[])[2])).toEqual([
      'udo-mic',
    ])
    expect((await state())?.speakerIds).toEqual(['adam', 'olga', 'ute'])
    expect(told()).toEqual([
      { type: 'microphoneMuted', by: 'Ute', to: ['udo'] },
      { type: 'floor', by: 'Ute', to: ['adam'] },
    ])
  })

  it('mutes the moderator too when they are not spared', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('ute')
    const result = await mutate({
      mutation: MuteAll,
      variables: { groupId: 'g1', exceptUserIds: [], floorUserIds: [] },
    })

    expect(result.data?.muteAllInVideoCall).toBe(2)
    expect(told()).toEqual([{ type: 'microphoneMuted', by: 'Ute', to: ['udo'] }])
  })

  it('is for moderators', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('udo')

    expect(
      errorOf(
        await mutate({
          mutation: MuteAll,
          variables: { groupId: 'g1', exceptUserIds: [], floorUserIds: [] },
        }),
      ),
    ).toBe('Only a moderator of the video call can do this.')
  })
})

describe('setVideoCallModerator', () => {
  const set = async (userId: string, moderator: boolean) =>
    mutate({ mutation: SetModerator, variables: { groupId: 'g1', userId, moderator } })

  it('lets anybody give up their own, and changes nothing otherwise for oneself', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('udo')

    expect((await set('udo', false)).data?.setVideoCallModerator).toBe(true)
    expect((await set('udo', true)).data?.setVideoCallModerator).toBe(true)
    expect((await state())?.moderatorIds).toEqual(['ute'])

    as('ute')
    await set('ute', false)

    // Handed on to the one left, as nobody else moderates.
    expect((await state())?.moderatorIds).toEqual(['udo'])
  })

  it('lets a moderator make another, telling them', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('ute')
    await set('udo', true)
    await set('udo', true)

    expect((await state())?.moderatorIds).toEqual(['udo', 'ute'])
    expect(told()).toEqual([{ type: 'moderator', reason: 'appointed', by: 'Ute', to: ['udo'] }])
  })

  it('is for moderators, and for people in the call', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('udo')

    expect(errorOf(await set('ute', false))).toBe('Only a moderator of the video call can do this.')

    as('ute')

    expect(errorOf(await set('adam', true))).toBe('They are not in the video call.')
  })

  it('takes it only from somebody below, who cannot have it back from a peer', async () => {
    inCall('adam', 'ute', 'udo')
    const sessionId = await open('adam')
    await setModerator(database.driver, sessionId, 'ute', { moderator: true })
    await setModerator(database.driver, sessionId, 'udo', { moderator: true })
    as('ute')

    expect(errorOf(await set('udo', false))).toBe(
      'You do not rank high enough in the group to do this to them.',
    )

    as('adam')
    await set('udo', false)

    expect(await state()).toMatchObject({ moderatorIds: ['adam', 'ute'], revokedIds: ['udo'] })
    expect(told()).toEqual([{ type: 'moderationRevoked', by: 'Adam', to: ['udo'] }])

    as('ute')

    expect(errorOf(await set('udo', true))).toBe(
      'You do not rank high enough in the group to do this to them.',
    )

    // An admin, who may step into calls, gives it back.
    as('adam')
    await set('udo', true)

    expect(await state()).toMatchObject({ revokedIds: [] })
  })

  it('changes nothing when taking it from somebody who has none', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('ute')

    expect((await set('udo', false)).data?.setVideoCallModerator).toBe(true)
    expect(told()).toEqual([])
  })
})

describe('setVideoCallEveryoneModerates', () => {
  const set = async (enabled: boolean) =>
    mutate({ mutation: SetEveryone, variables: { groupId: 'g1', enabled } })

  it('is switched on by a moderator and told to everybody, once', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('udo')

    expect(errorOf(await set(true))).toBe('Only a moderator of the video call can do this.')

    as('ute')
    await set(true)
    await set(true)

    expect((await state())?.everyoneModerates).toBe(true)
    expect(told()).toEqual([{ type: 'everyoneModerates', by: 'Ute', to: 'all' }])
  })

  it('is switched off by a moderator named as such, or one who may step in — nobody else', async () => {
    inCall('ute', 'udo', 'adam')
    const sessionId = await open('ute')
    await setEveryoneModerates(database.driver, sessionId, true)
    as('udo')

    expect(errorOf(await set(false))).toBe('Only a moderator of the video call can do this.')

    as('adam')
    await set(false)

    expect((await state())?.everyoneModerates).toBe(false)

    await setEveryoneModerates(database.driver, sessionId, true)
    as('ute')
    await set(false)

    expect(told()).toEqual([
      { type: 'everyoneModeratesOff', by: 'Adam', to: 'all' },
      { type: 'everyoneModeratesOff', by: 'Ute', to: 'all' },
    ])
  })
})

describe('takeOverVideoCallModeration', () => {
  it('is for those who may step in', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('udo')

    expect(
      errorOf(await mutate({ mutation: TakeOver, variables: { groupId: 'g1' } })),
    ).toBeDefined()
  })

  it('makes an admin a moderator and tells the moderators, once', async () => {
    inCall('ute', 'adam')
    await open('ute')
    as('adam')
    await mutate({ mutation: TakeOver, variables: { groupId: 'g1' } })
    await mutate({ mutation: TakeOver, variables: { groupId: 'g1' } })

    expect((await state())?.moderatorIds).toEqual(['adam', 'ute'])
    expect(told()).toEqual([{ type: 'moderationTakenOver', by: 'Adam', to: ['ute'] }])
  })
})

describe('setVideoCallFloor', () => {
  const floor = async (userId: string, given: boolean) =>
    mutate({ mutation: SetFloor, variables: { groupId: 'g1', userId, floor: given } })

  it('gives and takes the floor, telling whoever gets it', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('ute')
    await floor('udo', true)
    await floor('udo', true)
    await floor('ute', true)

    expect((await state())?.speakerIds).toEqual(['udo', 'ute'])

    await floor('udo', false)

    expect((await state())?.speakerIds).toEqual(['ute'])
    expect(told()).toEqual([{ type: 'floor', by: 'Ute', to: ['udo'] }])
  })

  it('is for moderators, and for people in the call', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('udo')

    expect(errorOf(await floor('ute', true))).toBe(
      'Only a moderator of the video call can do this.',
    )

    as('ute')

    expect(errorOf(await floor('adam', true))).toBe('They are not in the video call.')
  })
})

describe('handOverVideoCallModeration', () => {
  const handOver = async (variables: Record<string, unknown> = {}) =>
    mutate({ mutation: HandOver, variables: { groupId: 'g1', ...variables } })

  it('hands it to the one named, who is told', async () => {
    inCall('ute', 'udo', 'adam')
    await open('ute')
    as('ute')
    await handOver({ toUserId: 'udo' })

    expect(await state()).toMatchObject({ moderatorIds: ['udo'], starterHandedOver: true })
    expect(told()).toEqual([{ type: 'moderator', reason: 'handedOver', by: 'Ute', to: ['udo'] }])
  })

  it('hands it to the successor without a name, or with one not in the call', async () => {
    inCall('ute', 'udo', 'adam')
    await open('ute')
    as('ute')
    await handOver({ toUserId: 'olga' })

    expect((await state())?.moderatorIds).toEqual(['adam'])
  })

  it('tells nobody when the successor moderates already', async () => {
    inCall('ute', 'udo')
    const sessionId = await open('ute')
    await setModerator(database.driver, sessionId, 'udo', { moderator: true })
    as('ute')
    await handOver()

    expect((await state())?.moderatorIds).toEqual(['udo'])
    expect(told()).toEqual([])
  })

  it('passes over a revoked one, unless nobody else is there', async () => {
    inCall('ute', 'udo')
    const sessionId = await open('ute')
    await setModerator(database.driver, sessionId, 'udo', { moderator: false, revoked: true })
    as('ute')
    await handOver()

    expect((await state())?.moderatorIds).toEqual(['udo'])
  })

  it('lets everybody moderate, said once', async () => {
    inCall('ute', 'udo')
    const sessionId = await open('ute')
    as('ute')
    await handOver({ everyone: true })

    expect(await state()).toMatchObject({ everyoneModerates: true, moderatorIds: [] })

    await setModerator(database.driver, sessionId, 'ute', { moderator: true })
    await handOver({ everyone: true })

    expect(told()).toEqual([{ type: 'everyoneModerates', by: 'Ute', to: 'all' }])
  })

  it('changes nothing for one who is no moderator named as such', async () => {
    inCall('ute', 'udo')
    await open('ute')
    as('udo')

    expect((await handOver()).data?.handOverVideoCallModeration).toBe(true)
    expect((await state())?.moderatorIds).toEqual(['ute'])
  })

  it('gives up the moderation of one alone in the call, who then has it again', async () => {
    inCall('ute')
    await open('ute')
    as('ute')
    await handOver()

    // Settling finds nobody but them: a call with somebody in it keeps a moderator.
    expect((await state())?.moderatorIds).toEqual(['ute'])
  })
})

describe('standing', () => {
  it('puts a network admin who stepped in above every member', async () => {
    const fake = {
      groupAuthorization: {
        forGroup: async () =>
          Promise.resolve({ effective: new Set(), outranksMembers: true, has: () => false }),
        memberPermissions: async () => Promise.resolve(new Set(['group.member.remove'])),
        forGroupMemberRole: async () => Promise.resolve('admin'),
      },
    } as unknown as Context

    expect(await standing(fake, 'g1', 'adam')).toEqual({
      outranks: true,
      outranked: false,
      isOwner: false,
      mayModerateGroupCalls: false,
    })
  })
})
