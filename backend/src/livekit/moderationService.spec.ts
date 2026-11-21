import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { closeDriver, getDriver } from '@db/neo4j'

const service = {
  listParticipants: vi.fn(),
  updateRoomMetadata: vi.fn(),
  sendData: vi.fn(),
  removeParticipant: vi.fn(),
}

vi.mock('livekit-server-sdk', async (importOriginal) => {
  const original: Record<string, unknown> = await importOriginal()
  return {
    ...original,
    // `function`, not an arrow: the code under test constructs it.
    RoomServiceClient: vi.fn().mockImplementation(function () {
      return service
    }),
  }
})

const { TwirpError } = await import('livekit-server-sdk')
const { joinCallSession } = await import('./callSession')
const { markRemoved, moderationMetadata, readModeration, setModerator } =
  await import('./moderation')
const { connectionsOf, settleAndPublishModeration } = await import('./moderationService')

const driver = getDriver()
const config = {
  LIVEKIT_URL: 'wss://livekit.example.test',
  LIVEKIT_API_KEY: 'key',
  LIVEKIT_API_SECRET: 'secret',
}

const participant = (userId: string, joinedAt: bigint) => ({
  identity: `${userId}#1`,
  metadata: JSON.stringify({ userId }),
  joinedAt,
  tracks: [],
})

beforeEach(async () => {
  vi.clearAllMocks()
  service.listParticipants.mockResolvedValue([])
  service.updateRoomMetadata.mockResolvedValue({})
  service.sendData.mockResolvedValue(undefined)
  service.removeParticipant.mockResolvedValue(undefined)
  await cleanDatabase()
  const session = driver.session()
  try {
    await session.run(`
      CREATE (g:Group { id: 'g1' })
      CREATE (:User { id: 'ute' })-[:MEMBER_OF { role: 'usual' }]->(g)
      CREATE (:User { id: 'udo' })-[:MEMBER_OF { role: 'usual' }]->(g)
    `)
  } finally {
    await session.close()
  }
})

afterAll(async () => {
  await cleanDatabase()
  await closeDriver()
})

describe('connectionsOf', () => {
  it('knows no connections in a room the media server does not have', async () => {
    service.listParticipants.mockRejectedValue(new TwirpError('not_found', 'gone', 404))

    expect(await connectionsOf(config, 'g1')).toEqual([])

    service.listParticipants.mockRejectedValue(
      new TwirpError('not_found', 'gone', 400, 'not_found'),
    )

    expect(await connectionsOf(config, 'g1')).toEqual([])
  })

  it('passes any other failure on', async () => {
    service.listParticipants.mockRejectedValue(new Error('down'))

    await expect(connectionsOf(config, 'g1')).rejects.toThrow('down')
  })
})

describe('settleAndPublishModeration', () => {
  it('does nothing without a media server, or with nobody in the room', async () => {
    await settleAndPublishModeration({ driver, config: {} }, 'g1')
    await settleAndPublishModeration({ driver, config }, 'g1')

    expect(service.updateRoomMetadata).not.toHaveBeenCalled()
  })

  it('publishes the moderation and tells whoever it went to', async () => {
    await joinCallSession(driver, {
      groupId: 'g1',
      userId: 'ute',
      livekitRoom: 'group-g1',
      livekitSid: 'RM_1',
      presentUserIds: ['ute'],
    })
    const sessionId = (await readModeration(driver, 'g1'))?.sessionId as string
    await setModerator(driver, sessionId, 'ute', { moderator: false })
    service.listParticipants.mockResolvedValue([participant('udo', 1n)])
    await settleAndPublishModeration({ driver, config }, 'g1')

    expect(service.updateRoomMetadata).toHaveBeenCalledWith(
      'group-g1',
      JSON.stringify({ moderation: { moderators: ['udo'], everyone: false, speakers: [] } }),
    )
    expect(service.sendData).toHaveBeenCalledTimes(1)
    expect(service.sendData.mock.calls[0][3]).toEqual({
      topic: 'moderation',
      destinationIdentities: ['udo#1'],
    })
  })

  it("publishes nothing for a room it has no session of, which may be another instance's", async () => {
    // Somebody in a room of this name, but no session here: an instance sharing the media server
    // may moderate it, and "nobody moderates" would overwrite that on every poll.
    service.listParticipants.mockResolvedValue([participant('udo', 1n)])
    await settleAndPublishModeration({ driver, config }, 'g1', { published: '{"moderation":{}}' })

    expect(service.updateRoomMetadata).not.toHaveBeenCalled()
    expect(service.sendData).not.toHaveBeenCalled()
  })

  it('publishes only what differs from what the room has, when told what it has', async () => {
    await joinCallSession(driver, {
      groupId: 'g1',
      userId: 'ute',
      livekitRoom: 'group-g1',
      livekitSid: 'RM_1',
      presentUserIds: ['ute'],
    })
    service.listParticipants.mockResolvedValue([participant('ute', 1n)])
    const current = moderationMetadata(await readModeration(driver, 'g1'))
    await settleAndPublishModeration({ driver, config }, 'g1', { published: current })

    expect(service.updateRoomMetadata).not.toHaveBeenCalled()

    await settleAndPublishModeration({ driver, config }, 'g1', { published: '' })

    expect(service.updateRoomMetadata).toHaveBeenCalledWith('group-g1', current)
  })

  it('disconnects whoever was removed and is still there, when asked to', async () => {
    await joinCallSession(driver, {
      groupId: 'g1',
      userId: 'ute',
      livekitRoom: 'group-g1',
      livekitSid: 'RM_1',
      presentUserIds: ['ute', 'udo'],
    })
    const sessionId = (await readModeration(driver, 'g1'))?.sessionId as string
    await markRemoved(driver, sessionId, 'udo')
    service.listParticipants.mockResolvedValue([participant('ute', 1n), participant('udo', 2n)])
    await settleAndPublishModeration({ driver, config }, 'g1')

    expect(service.removeParticipant).not.toHaveBeenCalled()

    await settleAndPublishModeration({ driver, config }, 'g1', { leftoversIn: 'RM_1' })

    expect(service.removeParticipant).toHaveBeenCalledTimes(1)
    expect(service.removeParticipant).toHaveBeenCalledWith('group-g1', 'udo#1')
  })

  it('leaves alone whoever was removed from an earlier room of the same name', async () => {
    await joinCallSession(driver, {
      groupId: 'g1',
      userId: 'ute',
      livekitRoom: 'group-g1',
      livekitSid: 'RM_1',
      presentUserIds: ['ute', 'udo'],
    })
    const sessionId = (await readModeration(driver, 'g1'))?.sessionId as string
    await markRemoved(driver, sessionId, 'udo')
    // The room was opened anew, and nobody has asked for its chat yet.
    service.listParticipants.mockResolvedValue([participant('udo', 2n)])
    await settleAndPublishModeration({ driver, config }, 'g1', { leftoversIn: 'RM_2' })

    expect(service.removeParticipant).not.toHaveBeenCalled()
  })

  it('never throws', async () => {
    service.listParticipants.mockRejectedValue(new Error('down'))

    await expect(settleAndPublishModeration({ driver, config }, 'g1')).resolves.toBeUndefined()
  })
})
