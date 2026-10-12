import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { closeDriver, getDriver } from '@db/neo4j'

import {
  endCallSession,
  endCallSessionsOfMissingRoom,
  joinCallSession,
  MISSING_ROOM_GRACE_SECONDS,
  removeUserFromGroupCallRooms,
} from './callSession'

const driver = getDriver()

const run = async (cypher: string, params: Record<string, unknown> = {}) => {
  const session = driver.session()
  try {
    return await session.writeTransaction((transaction) => transaction.run(cypher, params))
  } finally {
    await session.close()
  }
}

// One call is one media-server room, told from the next by its sid. `present` is who the media
// server lists in it at that moment — by default the joining user alone.
const join = async (
  userId: string,
  livekitSid: string,
  present: string[] = [userId],
  groupId = 'group-1',
) =>
  joinCallSession(driver, {
    groupId,
    userId,
    livekitRoom: `group-${groupId}`,
    livekitSid,
    presentUserIds: present,
  })

// Moves every running session out of the grace window, as if it had been opened long ago.
const ageSessions = async () =>
  run(
    `
      MATCH (session:VideoCallSession)
      WHERE session.endedAt IS NULL
      SET session.createdAt = toString(datetime() - duration({ seconds: $seconds }))
    `,
    { seconds: MISSING_ROOM_GRACE_SECONDS * 10 },
  )

const sessions = async () => {
  const result = await run(`
    MATCH (room:Room)-[:ROOM_FOR]->(session:VideoCallSession)
    OPTIONAL MATCH (user:User)-[:CHATS_IN]->(room)
    WITH room, session, user ORDER BY user.id
    RETURN room.id AS roomId, session.livekitSid AS sid, session.endedAt IS NULL AS running,
           collect(user.id) AS users
    ORDER BY sid
  `)
  return result.records.map((record) => ({
    roomId: record.get('roomId') as string,
    sid: record.get('sid') as string,
    running: record.get('running') as boolean,
    users: record.get('users') as string[],
  }))
}

beforeEach(async () => {
  await cleanDatabase()
  await run(`
    CREATE (:Group { id: 'group-1' }), (:Group { id: 'group-2' })
    CREATE (:User { id: 'anna' }), (:User { id: 'ben' })
  `)
})

afterAll(async () => {
  await cleanDatabase()
  await closeDriver()
})

describe(joinCallSession, () => {
  it('opens a session with its chat room for the first participant', async () => {
    const roomId = await join('anna', 'RM_1')

    expect(await sessions()).toEqual([{ roomId, sid: 'RM_1', running: true, users: ['anna'] }])
  })

  it('names the group and the media-server room on the session', async () => {
    await join('anna', 'RM_1')

    const result = await run(`
      MATCH (session:VideoCallSession)-[:CALL_IN]->(group:Group)
      RETURN session.livekitRoom AS livekitRoom, group.id AS groupId
    `)

    expect(result.records).toHaveLength(1)
    expect(result.records[0].get('livekitRoom')).toBe('group-group-1')
    expect(result.records[0].get('groupId')).toBe('group-1')
  })

  it('puts everybody in the same media-server room into the same chat', async () => {
    const first = await join('anna', 'RM_1')
    const second = await join('ben', 'RM_1', ['anna', 'ben'])

    expect(second).toBe(first)
    expect(await sessions()).toEqual([
      { roomId: first, sid: 'RM_1', running: true, users: ['anna', 'ben'] },
    ])
  })

  it('does not add a participant twice', async () => {
    const first = await join('anna', 'RM_1')
    await join('anna', 'RM_1')

    expect(await sessions()).toEqual([
      { roomId: first, sid: 'RM_1', running: true, users: ['anna'] },
    ])
  })

  it('opens one session when two participants ask at the same moment', async () => {
    const [first, second] = await Promise.all([
      join('anna', 'RM_1', ['anna', 'ben']),
      join('ben', 'RM_1', ['anna', 'ben']),
    ])

    expect(second).toBe(first)
    expect(await sessions()).toEqual([
      { roomId: first, sid: 'RM_1', running: true, users: ['anna', 'ben'] },
    ])
  })

  describe('in a room everybody has left, which the media server still keeps', () => {
    it('gives somebody who was not in the call a new chat, and ends the old one', async () => {
      const earlier = await join('anna', 'RM_1')
      const next = await join('ben', 'RM_1')

      expect(next).not.toBe(earlier)
      expect(await sessions()).toEqual(
        expect.arrayContaining([
          { roomId: earlier, sid: 'RM_1', running: false, users: ['anna'] },
          { roomId: next, sid: 'RM_1', running: true, users: ['ben'] },
        ]),
      )
    })

    it('lets somebody who was in the call carry on with the chat', async () => {
      const first = await join('anna', 'RM_1')
      await join('ben', 'RM_1', ['anna', 'ben'])
      // Both gone; Ben comes back alone.
      const again = await join('ben', 'RM_1')

      expect(again).toBe(first)
      expect(await sessions()).toEqual([
        { roomId: first, sid: 'RM_1', running: true, users: ['anna', 'ben'] },
      ])
    })

    it('lets a newcomer in on the chat when somebody of the call is back as well', async () => {
      const first = await join('anna', 'RM_1')
      await run(`CREATE (:User { id: 'carl' })`)
      const carl = await join('carl', 'RM_1', ['anna', 'carl'])

      expect(carl).toBe(first)
    })

    it('puts two newcomers arriving together into one new chat', async () => {
      const earlier = await join('anna', 'RM_1')
      await run(`CREATE (:User { id: 'carl' })`)
      const [ben, carl] = await Promise.all([
        join('ben', 'RM_1', ['ben', 'carl']),
        join('carl', 'RM_1', ['ben', 'carl']),
      ])

      expect(ben).not.toBe(earlier)
      expect(carl).toBe(ben)
    })

    it('brings those of the old chat into the new one once a newcomer has started it', async () => {
      const earlier = await join('anna', 'RM_1')
      const next = await join('ben', 'RM_1')
      const anna = await join('anna', 'RM_1', ['anna', 'ben'])

      expect(anna).toBe(next)
      expect(anna).not.toBe(earlier)
    })
  })

  it('starts a new chat for the next call and ends the session the earlier one left running', async () => {
    const earlier = await join('anna', 'RM_1')
    const next = await join('ben', 'RM_2')

    expect(next).not.toBe(earlier)
    expect(await sessions()).toEqual([
      { roomId: earlier, sid: 'RM_1', running: false, users: ['anna'] },
      { roomId: next, sid: 'RM_2', running: true, users: ['ben'] },
    ])
  })

  it('keeps the calls of different groups apart', async () => {
    const one = await join('anna', 'RM_1', ['anna'], 'group-1')
    const two = await join('anna', 'RM_2', ['anna'], 'group-2')

    expect(two).not.toBe(one)
    expect(await sessions()).toEqual([
      { roomId: one, sid: 'RM_1', running: true, users: ['anna'] },
      { roomId: two, sid: 'RM_2', running: true, users: ['anna'] },
    ])
  })

  it('returns null for a group that does not exist', async () => {
    await expect(join('anna', 'RM_1', ['anna'], 'no-such-group')).resolves.toBeNull()
    expect(await sessions()).toEqual([])
  })
})

describe(endCallSession, () => {
  it('ends the session of that media-server room', async () => {
    const roomId = await join('anna', 'RM_1')

    await endCallSession(driver, 'RM_1')

    expect(await sessions()).toEqual([{ roomId, sid: 'RM_1', running: false, users: ['anna'] }])
  })

  it('leaves the session of another room alone', async () => {
    const roomId = await join('anna', 'RM_2')

    await endCallSession(driver, 'RM_1')

    expect(await sessions()).toEqual([{ roomId, sid: 'RM_2', running: true, users: ['anna'] }])
  })
})

describe(endCallSessionsOfMissingRoom, () => {
  it('ends the session running under that room name', async () => {
    const roomId = await join('anna', 'RM_1')
    await ageSessions()

    await endCallSessionsOfMissingRoom(driver, 'group-group-1')

    expect(await sessions()).toEqual([{ roomId, sid: 'RM_1', running: false, users: ['anna'] }])
  })

  it('spares a session just opened, which belongs to a room opened since', async () => {
    const roomId = await join('anna', 'RM_1')

    await endCallSessionsOfMissingRoom(driver, 'group-group-1')

    expect(await sessions()).toEqual([{ roomId, sid: 'RM_1', running: true, users: ['anna'] }])
  })

  it('leaves the sessions of other rooms alone', async () => {
    const roomId = await join('anna', 'RM_1')
    await ageSessions()

    await endCallSessionsOfMissingRoom(driver, 'group-group-2')

    expect(await sessions()).toEqual([{ roomId, sid: 'RM_1', running: true, users: ['anna'] }])
  })
})

describe(removeUserFromGroupCallRooms, () => {
  it('takes the user out of the conference chats of that group only', async () => {
    const one = await join('anna', 'RM_1', ['anna'], 'group-1')
    await join('ben', 'RM_1', ['anna', 'ben'], 'group-1')
    const two = await join('anna', 'RM_2', ['anna'], 'group-2')

    const session = driver.session()
    try {
      await session.writeTransaction(async (transaction) =>
        removeUserFromGroupCallRooms(transaction, 'group-1', 'anna'),
      )
    } finally {
      await session.close()
    }

    const after = await sessions()

    expect(after.find((entry) => entry.roomId === one)?.users).toEqual(['ben'])
    expect(after.find((entry) => entry.roomId === two)?.users).toEqual(['anna'])
  })
})
