/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TrackSource, TwirpError } from 'livekit-server-sdk'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { closeDriver, getDriver } from '@db/neo4j'
import logger from '@src/logger'

import { joinCallSession } from './callSession'
import {
  identitiesOf,
  listConnections,
  markRemoved,
  moderates,
  moderationMetadata,
  MODERATION_TOPIC,
  muteTracks,
  notify,
  presentUsers,
  publishModeration,
  readModeration,
  removeConnections,
  setEveryoneModerates,
  setModerator,
  setSpeaker,
  setSpeakers,
  settleModeration,
  SOURCES,
  successorOf,
} from './moderation'

import type { Connection, ModerationState } from './moderation'
import type { RoomServiceClient } from 'livekit-server-sdk'

const driver = getDriver()

const run = async (cypher: string, params: Record<string, unknown> = {}) => {
  const session = driver.session()
  try {
    return await session.writeTransaction((transaction) => transaction.run(cypher, params))
  } finally {
    await session.close()
  }
}

// Opens the call's session as `starter`, the way joining its chat does.
const open = async (starter = 'olga', present: string[] = [starter]) =>
  joinCallSession(driver, {
    groupId: 'g1',
    userId: starter,
    livekitRoom: 'group-g1',
    livekitSid: 'RM_1',
    presentUserIds: present,
  })

const state = async () => (await readModeration(driver, 'g1')) as ModerationState

// A group with an owner, an admin and two ordinary members, each role carrying its rights the
// way the group roles store them.
beforeEach(async () => {
  await cleanDatabase()
  await run(
    `
      CREATE (g:Group { id: 'g1' })
      CREATE (g)-[:HAS_GROUP_ROLE]->(:GroupRole { id: 'g1:owner', name: 'owner', permissions: '[]' })
      CREATE (g)-[:HAS_GROUP_ROLE]->(:GroupRole { id: 'g1:admin', name: 'admin', permissions: $admin })
      CREATE (g)-[:HAS_GROUP_ROLE]->(:GroupRole { id: 'g1:usual', name: 'usual', permissions: $usual })
      CREATE (g)-[:HAS_GROUP_ROLE]->(:GroupRole { id: 'g1:broken', name: 'broken', permissions: 'nonsense' })
      CREATE (g)-[:HAS_GROUP_ROLE]->(:GroupRole { id: 'g1:shaped', name: 'shaped', permissions: $shaped })
      CREATE (g)-[:HAS_GROUP_ROLE]->(:GroupRole { id: 'g1:flag', name: 'flag', permissions: 'true' })
      CREATE (:User { id: 'olga' })-[:MEMBER_OF { role: 'owner' }]->(g)
      CREATE (:User { id: 'adam' })-[:MEMBER_OF { role: 'admin' }]->(g)
      CREATE (:User { id: 'ute' })-[:MEMBER_OF { role: 'usual' }]->(g)
      CREATE (:User { id: 'udo' })-[:MEMBER_OF { role: 'usual' }]->(g)
      CREATE (:User { id: 'bert' })-[:MEMBER_OF { role: 'broken' }]->(g)
      CREATE (:User { id: 'bea' })-[:MEMBER_OF { role: 'shaped' }]->(g)
      CREATE (:User { id: 'flo' })-[:MEMBER_OF { role: 'flag' }]->(g)
      CREATE (:User { id: 'guest' })
    `,
    {
      admin: JSON.stringify(['group.read', 'group.post.pin', 'group.member.remove']),
      usual: JSON.stringify(['group.read']),
      // Valid JSON, but no list of keys: malformed all the same.
      shaped: JSON.stringify({ 'group.read': true }),
    },
  )
})

afterAll(async () => {
  await cleanDatabase()
  await closeDriver()
})

describe(readModeration, () => {
  it('knows no moderation while no session is open', async () => {
    expect(await readModeration(driver, 'g1')).toBeNull()
  })

  it('makes whoever opens the session its starter and moderator', async () => {
    await open('ute')

    expect(await state()).toEqual({
      sessionId: expect.any(String),
      livekitSid: 'RM_1',
      starterId: 'ute',
      starterHandedOver: false,
      moderatorIds: ['ute'],
      everyoneModerates: false,
      speakerIds: [],
      revokedIds: [],
      removedIds: [],
      revision: 0,
    })
  })
})

describe(moderates, () => {
  it('holds for moderators, and for everybody once everybody moderates', async () => {
    await open('ute')

    expect(moderates(await state(), 'ute')).toBe(true)
    expect(moderates(await state(), 'udo')).toBe(false)

    await setEveryoneModerates(driver, (await state()).sessionId, true)

    expect(moderates(await state(), 'udo')).toBe(true)
  })
})

describe(setModerator, () => {
  it('appoints, gives up and revokes', async () => {
    await open('ute')
    const { sessionId } = await state()
    await setModerator(driver, sessionId, 'udo', { moderator: true })

    expect((await state()).moderatorIds).toEqual(['udo', 'ute'])

    // Given up: the starter has handed it on, not had it taken.
    await setModerator(driver, sessionId, 'ute', { moderator: false })

    expect(await state()).toMatchObject({
      moderatorIds: ['udo'],
      starterHandedOver: true,
      revokedIds: [],
    })

    await setModerator(driver, sessionId, 'udo', { moderator: false, revoked: true })

    expect(await state()).toMatchObject({ moderatorIds: [], revokedIds: ['udo'] })

    // Not given back without being asked to: the revocation holds.
    expect(await setModerator(driver, sessionId, 'udo', { moderator: true })).toBe(false)
    expect(await state()).toMatchObject({ moderatorIds: [], revokedIds: ['udo'] })

    // Given back: the revocation goes with it.
    expect(await setModerator(driver, sessionId, 'udo', { moderator: true, restore: true })).toBe(
      true,
    )

    expect(await state()).toMatchObject({ moderatorIds: ['udo'], revokedIds: [] })
  })
})

// Runs `meanwhile` just before the next write of the moderation, after whatever was read before:
// as another moderator acting at that very moment would.
const beforeNextWrite = (meanwhile: (sessionId: string) => Promise<void>) => {
  const real = driver.session.bind(driver)
  const spy = vi.spyOn(driver, 'session')
  // Reading goes through; the first write finds what was done just before it.
  spy.mockImplementation((...args) => {
    const session = real(...args)
    const writeTransaction = session.writeTransaction.bind(session)
    session.writeTransaction = (async (work: Parameters<typeof writeTransaction>[0]) => {
      spy.mockRestore()
      await meanwhile((await state()).sessionId)
      return writeTransaction(work)
    }) as typeof session.writeTransaction
    return session
  })
}

// Takes the moderation from `userId` that way.
const revokeBeforeNextWrite = (userId: string) => {
  beforeNextWrite(async (sessionId) => {
    await setModerator(driver, sessionId, userId, { moderator: false, revoked: true })
  })
}

describe('the floor', () => {
  it('is given to exactly those named, and one by one', async () => {
    await open('ute')
    const { sessionId } = await state()
    await setSpeakers(driver, sessionId, ['udo', 'adam'])

    expect((await state()).speakerIds).toEqual(['adam', 'udo'])

    await setSpeakers(driver, sessionId, ['ute'])

    expect((await state()).speakerIds).toEqual(['ute'])

    await setSpeakers(driver, sessionId, [])

    expect((await state()).speakerIds).toEqual([])

    await setSpeaker(driver, sessionId, 'udo', true)

    expect((await state()).speakerIds).toEqual(['udo'])

    await setSpeaker(driver, sessionId, 'udo', false)

    expect((await state()).speakerIds).toEqual([])
  })
})

describe(markRemoved, () => {
  it('takes the moderation, the floor and the chat away', async () => {
    await open('ute')
    await open('udo', ['ute', 'udo'])
    const { sessionId } = await state()
    await setModerator(driver, sessionId, 'udo', { moderator: true })
    await setSpeaker(driver, sessionId, 'udo', true)
    await markRemoved(driver, sessionId, 'udo')

    expect(await state()).toMatchObject({
      moderatorIds: ['ute'],
      speakerIds: [],
      removedIds: ['udo'],
    })

    const chats = await run(`MATCH (:User { id: 'udo' })-[c:CHATS_IN]->() RETURN count(c) AS n`)

    expect(Number(chats.records[0].get('n'))).toBe(0)
  })

  it('does not let them back into the chat by a join asked for before', async () => {
    await open('ute')
    await open('udo', ['ute', 'udo'])
    const { sessionId } = await state()
    await markRemoved(driver, sessionId, 'udo')

    expect(await open('udo', ['ute', 'udo'])).toBeNull()

    const chats = await run(`MATCH (:User { id: 'udo' })-[c:CHATS_IN]->() RETURN count(c) AS n`)

    expect(Number(chats.records[0].get('n'))).toBe(0)
  })

  it('does not let them open a session of their own once the others have gone', async () => {
    await open('ute')
    await open('udo', ['ute', 'udo'])
    const { sessionId } = await state()
    await markRemoved(driver, sessionId, 'udo')

    // Ute has left; Udo is still connected, the disconnecting not through yet.
    expect(await open('udo', ['udo'])).toBeNull()
    expect(await state()).toMatchObject({ sessionId, removedIds: ['udo'] })

    const chats = await run(`MATCH (:User { id: 'udo' })-[c:CHATS_IN]->() RETURN count(c) AS n`)

    expect(Number(chats.records[0].get('n'))).toBe(0)
  })

  it('reaches a new chat started in the same room after the session was read', async () => {
    await open('ute')
    await open('udo', ['ute', 'udo'])
    const { sessionId } = await state()
    // Meanwhile all seem gone to the media server, and Adam starts a new chat in the room.
    await open('adam')
    await markRemoved(driver, sessionId, 'udo')

    expect(await state()).toMatchObject({ removedIds: ['udo'] })
    expect(sessionId).not.toBe((await state()).sessionId)
    expect(await open('udo', ['adam', 'udo'])).toBeNull()
  })

  it('lets them into the next call, a media-server room of another sid', async () => {
    await open('ute')
    await open('udo', ['ute', 'udo'])
    const { sessionId } = await state()
    await markRemoved(driver, sessionId, 'udo')

    const roomId = await joinCallSession(driver, {
      groupId: 'g1',
      userId: 'udo',
      livekitRoom: 'group-g1',
      livekitSid: 'RM_2',
      presentUserIds: ['udo'],
    })

    expect(roomId).toEqual(expect.any(String))
    expect(await state()).toMatchObject({ removedIds: [] })
  })
})

describe(successorOf, () => {
  it('picks one nobody else outranks, and of those the longest in the call', async () => {
    expect(await successorOf(driver, 'g1', ['ute', 'adam', 'olga'])).toBe('olga')
    expect(await successorOf(driver, 'g1', ['ute', 'adam', 'udo'])).toBe('adam')
    expect(await successorOf(driver, 'g1', ['udo', 'ute'])).toBe('udo')
  })

  it('counts a malformed role, and somebody not in the group, as holding nothing', async () => {
    expect(await successorOf(driver, 'g1', ['bert', 'guest', 'ute'])).toBe('ute')
    expect(await successorOf(driver, 'g1', ['guest', 'bert'])).toBe('guest')
  })

  it('counts a role whose rights are valid JSON but no list of keys as holding nothing', async () => {
    expect(await successorOf(driver, 'g1', ['bea', 'flo', 'ute'])).toBe('ute')
    expect(await successorOf(driver, 'g1', ['flo', 'bea'])).toBe('flo')
  })

  it('finds nobody among nobody', async () => {
    expect(await successorOf(driver, 'g1', [])).toBeNull()
  })
})

describe(settleModeration, () => {
  it('does nothing without a session, or while everybody moderates', async () => {
    expect(await settleModeration(driver, 'g1', ['ute'])).toBeNull()

    await open('ute')
    await setEveryoneModerates(driver, (await state()).sessionId, true)

    expect(await settleModeration(driver, 'g1', ['udo'])).toBeNull()
  })

  it('leaves it alone while a moderator is there', async () => {
    await open('ute')

    expect(await settleModeration(driver, 'g1', ['ute', 'udo'])).toBeNull()
  })

  it('gives the starter the moderation back on returning', async () => {
    await open('ute')
    await run(`MATCH (:User { id: 'ute' })-[m:MODERATES_CALL]->() DELETE m`)

    expect(await settleModeration(driver, 'g1', ['udo', 'ute'])).toBe('ute')
    expect((await state()).moderatorIds).toEqual(['ute'])
  })

  it('does not give it back to a starter who handed it on', async () => {
    await open('ute')
    const { sessionId } = await state()
    await setModerator(driver, sessionId, 'udo', { moderator: true })
    await setModerator(driver, sessionId, 'ute', { moderator: false })

    expect(await settleModeration(driver, 'g1', ['ute', 'udo'])).toBeNull()
    expect((await state()).moderatorIds).toEqual(['udo'])
  })

  it('hands it to the successor once no moderator is left, passing over the revoked', async () => {
    await open('ute')
    const { sessionId } = await state()
    await setModerator(driver, sessionId, 'adam', { moderator: false, revoked: true })
    await setModerator(driver, sessionId, 'ute', { moderator: false })

    expect(await settleModeration(driver, 'g1', ['adam', 'udo'])).toBe('udo')
  })

  it('gives it to a revoked one when nobody else is there, never to the removed', async () => {
    await open('ute')
    const { sessionId } = await state()
    await setModerator(driver, sessionId, 'udo', { moderator: false, revoked: true })
    await markRemoved(driver, sessionId, 'adam')
    await setModerator(driver, sessionId, 'ute', { moderator: false })

    expect(await settleModeration(driver, 'g1', ['adam', 'udo'])).toBe('udo')
  })

  it('does not give the starter back what was taken from them after the state was read', async () => {
    await open('ute')
    await run(`MATCH (:User { id: 'ute' })-[m:MODERATES_CALL]->() DELETE m`)
    revokeBeforeNextWrite('ute')

    // Nobody now: the next settling, with whoever is there by then, decides.
    expect(await settleModeration(driver, 'g1', ['ute', 'udo'])).toBeNull()
    expect(await state()).toMatchObject({ moderatorIds: [], revokedIds: ['ute'] })
  })

  it('does not give a successor back what was taken from them after the state was read', async () => {
    await open('ute')
    await setModerator(driver, (await state()).sessionId, 'ute', { moderator: false })
    revokeBeforeNextWrite('adam')

    expect(await settleModeration(driver, 'g1', ['adam', 'udo'])).toBeNull()
    expect(await state()).toMatchObject({ moderatorIds: [], revokedIds: ['adam'] })
    // The next settling finds the revocation and passes them over.
    expect(await settleModeration(driver, 'g1', ['adam', 'udo'])).toBe('udo')
  })

  it('does not give a revoked one back what was given and taken again after the state was read', async () => {
    await open('ute')
    const { sessionId } = await state()
    await setModerator(driver, sessionId, 'udo', { moderator: false, revoked: true })
    await setModerator(driver, sessionId, 'ute', { moderator: false })
    // Udo alone is there and would get it back; meanwhile Olga comes in, gives it back to him
    // and takes it again.
    beforeNextWrite(async (current) => {
      await setModerator(driver, current, 'olga', { moderator: true, restore: true })
      await setModerator(driver, current, 'udo', { moderator: true, restore: true })
      await setModerator(driver, current, 'udo', { moderator: false, revoked: true })
    })

    expect(await settleModeration(driver, 'g1', ['udo'])).toBeNull()
    expect(await state()).toMatchObject({ moderatorIds: ['olga'], revokedIds: ['udo'] })
  })

  it('counts every change of the moderation', async () => {
    await open('ute')
    const { sessionId } = await state()
    await setModerator(driver, sessionId, 'udo', { moderator: true })
    await setModerator(driver, sessionId, 'udo', { moderator: false, revoked: true })
    // Refused: no change, nothing counted.
    await setModerator(driver, sessionId, 'udo', { moderator: true })

    expect((await state()).revision).toBe(2)
    expect(
      await setModerator(driver, sessionId, 'udo', {
        moderator: true,
        restore: { unchangedSince: 1 },
      }),
    ).toBe(false)
    expect(
      await setModerator(driver, sessionId, 'udo', {
        moderator: true,
        restore: { unchangedSince: 2 },
      }),
    ).toBe(true)
    expect(await state()).toMatchObject({
      moderatorIds: ['udo', 'ute'],
      revokedIds: [],
      revision: 3,
    })
  })

  it('finds nobody in an empty call', async () => {
    await open('ute')
    await setModerator(driver, (await state()).sessionId, 'ute', { moderator: false })

    expect(await settleModeration(driver, 'g1', [])).toBeNull()
  })
})

describe('the media server', () => {
  const client = (overrides: Record<string, unknown> = {}) =>
    ({
      listParticipants: vi.fn().mockResolvedValue([
        { identity: 'b#2', metadata: '{"userId":"b"}', joinedAt: 2n, tracks: [] },
        {
          identity: 'a#1',
          metadata: '',
          joinedAt: 1n,
          tracks: [{ sid: 'TR_1', source: TrackSource.MICROPHONE, muted: false }],
        },
        { identity: 'c#1', metadata: '', tracks: [] },
      ]),
      mutePublishedTrack: vi.fn().mockResolvedValue({}),
      removeParticipant: vi.fn().mockResolvedValue(undefined),
      updateRoomMetadata: vi.fn().mockResolvedValue({}),
      sendData: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as unknown as RoomServiceClient & Record<string, ReturnType<typeof vi.fn>>

  const userIdOf = ({ identity, metadata }: { identity?: string; metadata?: string }) =>
    metadata
      ? (JSON.parse(metadata) as { userId: string }).userId
      : (identity ?? '').split('#')[0] || null

  it('lists the connections in the order they joined, with what they publish', async () => {
    const connections = await listConnections(client(), 'group-g1', userIdOf)

    expect(connections.map(({ identity }) => identity)).toEqual(['c#1', 'a#1', 'b#2'])
    expect(connections[1].tracks).toEqual([
      { sid: 'TR_1', source: TrackSource.MICROPHONE, muted: false },
    ])
    expect(presentUsers([...connections, { identity: 'x', userId: null, tracks: [] }])).toEqual([
      'c',
      'a',
      'b',
    ])
    expect(identitiesOf(connections, ['a', 'b'])).toEqual(['a#1', 'b#2'])
  })

  it('mutes what is on of the sources asked for, and nothing else', async () => {
    const service = client()
    const connections: Connection[] = [
      {
        identity: 'a#1',
        userId: 'a',
        tracks: [
          { sid: 'mic', source: TrackSource.MICROPHONE, muted: false },
          { sid: 'mic-off', source: TrackSource.MICROPHONE, muted: true },
          { sid: 'cam', source: TrackSource.CAMERA, muted: false },
        ],
      },
    ]
    await muteTracks(service, 'group-g1', connections, SOURCES.microphone)

    expect(service.mutePublishedTrack).toHaveBeenCalledTimes(1)
    expect(service.mutePublishedTrack).toHaveBeenCalledWith('group-g1', 'a#1', 'mic', true)
  })

  it('mutes every other track when one cannot be muted, and does not fail', async () => {
    const mutePublishedTrack = vi
      .fn()
      .mockRejectedValueOnce(new Error('track not found'))
      .mockResolvedValue(undefined)
    const service = client({ mutePublishedTrack })
    const connections: Connection[] = [
      {
        identity: 'a#1',
        userId: 'a',
        tracks: [{ sid: 'gone', source: TrackSource.MICROPHONE, muted: false }],
      },
      {
        identity: 'b#1',
        userId: 'b',
        tracks: [{ sid: 'mic', source: TrackSource.MICROPHONE, muted: false }],
      },
    ]

    await expect(
      muteTracks(service, 'group-g1', connections, SOURCES.microphone),
    ).resolves.toBeUndefined()
    expect(mutePublishedTrack).toHaveBeenCalledWith('group-g1', 'b#1', 'mic', true)
  })

  it('removes connections', async () => {
    const service = client()
    await removeConnections(service, 'group-g1', [{ identity: 'a#1', userId: 'a', tracks: [] }])

    expect(service.removeParticipant).toHaveBeenCalledWith('group-g1', 'a#1')
  })

  it('removes every other connection when one cannot be removed, and does not fail', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    const removeParticipant = vi
      .fn()
      // Gone meanwhile: what was wanted, not worth a word.
      .mockRejectedValueOnce(new TwirpError('Not Found', 'participant not found', 404, 'not_found'))
      // Told by its code alone, whatever the status.
      .mockRejectedValueOnce(new TwirpError('Not Found', 'participant not found', 400, 'not_found'))
      .mockRejectedValueOnce(new Error('media server down'))
      .mockResolvedValue(undefined)
    const service = client({ removeParticipant })
    const connection = (identity: string) => ({ identity, userId: 'a', tracks: [] })

    await expect(
      removeConnections(service, 'group-g1', [
        connection('a#1'),
        connection('a#2'),
        connection('a#3'),
        connection('a#4'),
      ]),
    ).resolves.toBeUndefined()
    expect(removeParticipant).toHaveBeenCalledWith('group-g1', 'a#4')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('could not be removed'),
      expect.objectContaining({ message: 'media server down' }),
    )

    warn.mockRestore()
  })

  it('publishes the state for every participant, and carries on when it cannot', async () => {
    await open('ute')
    const service = client()
    await publishModeration(service, 'group-g1', await state())

    expect(service.updateRoomMetadata).toHaveBeenCalledWith(
      'group-g1',
      JSON.stringify({ moderation: { moderators: ['ute'], everyone: false, speakers: [] } }),
    )
    expect(moderationMetadata(null)).toBe(JSON.stringify({ moderation: null }))

    const failing = client({ updateRoomMetadata: vi.fn().mockRejectedValue(new Error('down')) })

    await expect(publishModeration(failing, 'group-g1', null)).resolves.toBeUndefined()
  })

  it('sends a notice to some connections or to everybody, and none to nobody', async () => {
    const sendData = vi.fn().mockResolvedValue(undefined)
    const service = client({ sendData })
    await notify(service, 'group-g1', { type: 'floor', by: 'Anna' }, ['a#1'])
    await notify(service, 'group-g1', { type: 'everyoneModerates' })
    await notify(service, 'group-g1', { type: 'floor' }, [])

    expect(sendData).toHaveBeenCalledTimes(2)

    const [first, second] = sendData.mock.calls as [string, Uint8Array, unknown, unknown][]

    expect(JSON.parse(new TextDecoder().decode(first[1]))).toEqual({
      type: 'floor',
      by: 'Anna',
    })
    expect(first[3]).toEqual({ topic: MODERATION_TOPIC, destinationIdentities: ['a#1'] })
    expect(second[3]).toEqual({ topic: MODERATION_TOPIC })
  })

  it('carries on when a notice cannot be sent', async () => {
    const failing = client({ sendData: vi.fn().mockRejectedValue(new Error('down')) })

    await expect(notify(failing, 'group-g1', { type: 'floor' })).resolves.toBeUndefined()
  })
})
