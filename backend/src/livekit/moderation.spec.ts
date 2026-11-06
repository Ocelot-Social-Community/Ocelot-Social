/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TrackSource } from 'livekit-server-sdk'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { closeDriver, getDriver } from '@db/neo4j'

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
      CREATE (:User { id: 'olga' })-[:MEMBER_OF { role: 'owner' }]->(g)
      CREATE (:User { id: 'adam' })-[:MEMBER_OF { role: 'admin' }]->(g)
      CREATE (:User { id: 'ute' })-[:MEMBER_OF { role: 'usual' }]->(g)
      CREATE (:User { id: 'udo' })-[:MEMBER_OF { role: 'usual' }]->(g)
      CREATE (:User { id: 'bert' })-[:MEMBER_OF { role: 'broken' }]->(g)
      CREATE (:User { id: 'guest' })
    `,
    {
      admin: JSON.stringify(['group.read', 'group.post.pin', 'group.member.remove']),
      usual: JSON.stringify(['group.read']),
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
      starterId: 'ute',
      starterHandedOver: false,
      moderatorIds: ['ute'],
      everyoneModerates: false,
      speakerIds: [],
      revokedIds: [],
      removedIds: [],
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

    // Given back: the revocation goes with it.
    await setModerator(driver, sessionId, 'udo', { moderator: true })

    expect(await state()).toMatchObject({ moderatorIds: ['udo'], revokedIds: [] })
  })
})

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

  it('removes connections', async () => {
    const service = client()
    await removeConnections(service, 'group-g1', [{ identity: 'a#1', userId: 'a', tracks: [] }])

    expect(service.removeParticipant).toHaveBeenCalledWith('group-g1', 'a#1')
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
    const service = client()
    await notify(service, 'group-g1', { type: 'floor', by: 'Anna' }, ['a#1'])
    await notify(service, 'group-g1', { type: 'everyoneModerates' })
    await notify(service, 'group-g1', { type: 'floor' }, [])

    expect(service.sendData).toHaveBeenCalledTimes(2)

    const [first, second] = vi.mocked(service.sendData).mock.calls

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
