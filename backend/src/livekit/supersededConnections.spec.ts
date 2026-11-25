// A browser tab is in a call once: a connection it left behind is taken out once it joins anew,
// while the user's other tabs and devices stay (#10682). No database here, only the media server.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const service = {
  listParticipants: vi.fn(),
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

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
vi.mock('@src/logger', () => ({
  __esModule: true,
  get default() {
    return mockLogger
  },
}))

const { TwirpError } = await import('livekit-server-sdk')
const { supersededConnections } = await import('./moderation')
const { dropSupersededConnections } = await import('./moderationService')
// With the instance's prefix, should the environment have one (LIVEKIT_ROOM_PREFIX).
const { roomNameForGroup } = await import('./rooms')
const room = roomNameForGroup('g1')

const config = {
  LIVEKIT_URL: 'wss://livekit.example.test',
  LIVEKIT_API_KEY: 'key',
  LIVEKIT_API_SECRET: 'secret',
}

const connection = (identity: string, joinedAtMs: number) => ({
  identity,
  userId: identity.split('#')[0],
  joinedAtMs,
  tracks: [],
})

const participant = (identity: string, joinedAt: bigint, joinedAtMs?: bigint) => ({
  identity,
  metadata: JSON.stringify({ userId: identity.split('#')[0] }),
  joinedAt,
  joinedAtMs,
  tracks: [],
})

const removed = () => service.removeParticipant.mock.calls.map(([, identity]) => identity as string)

beforeEach(() => {
  vi.clearAllMocks()
  service.listParticipants.mockResolvedValue([])
  service.removeParticipant.mockResolvedValue(undefined)
})

describe('supersededConnections', () => {
  it('are the older connections of a tab that has joined anew', () => {
    const connections = [
      connection('ute#tab-aaaa1#01', 1000),
      connection('ute#tab-aaaa1#02', 2000),
      connection('ute#tab-aaaa1#03', 3000),
    ]

    expect(supersededConnections(connections)).toEqual([connections[0], connections[1]])
  })

  it("are none of the user's other tabs and devices", () => {
    // Two devices of the same user, each in the call once: both stay.
    const connections = [connection('ute#laptop-01#01', 1000), connection('ute#phone-001#02', 2000)]

    expect(supersededConnections(connections)).toEqual([])
  })

  it("are none of somebody else's, even with the same tab id", () => {
    const connections = [connection('ute#tab-aaaa1#01', 1000), connection('udo#tab-aaaa1#02', 2000)]

    expect(supersededConnections(connections)).toEqual([])
  })

  it('are none of the connections without a tab id, as of an older webapp', () => {
    const connections = [connection('ute#01', 1000), connection('ute#02', 2000)]

    expect(supersededConnections(connections)).toEqual([])
  })

  it('are none of two whose join times cannot tell which is the newer', () => {
    // A media server that tells whole seconds only: both joined in the same one.
    const connections = [
      connection('ute#tab-aaaa1#01', 10_000),
      connection('ute#tab-aaaa1#02', 10_000),
    ]

    expect(supersededConnections(connections)).toEqual([])
  })

  it('are none whose join time the media server does not tell', () => {
    const connections = [connection('ute#tab-aaaa1#01', 0), connection('ute#tab-aaaa1#02', 10_000)]

    expect(supersededConnections(connections)).toEqual([])
  })

  it('are those whose token was issued before, whatever order they joined in', () => {
    // A join the tab gave up reached the media server after the one it went on with.
    const kept = connection('ute#tab-aaaa1#100-aaaaaaaa', 9_000)
    const givenUp = connection('ute#tab-aaaa1#0zz-bbbbbbbb', 10_000)

    expect(supersededConnections([kept, givenUp])).toEqual([givenUp])
  })

  it('are the older ones only, while two newest ones are tied', () => {
    const connections = [
      connection('ute#tab-aaaa1#01', 5_000),
      connection('ute#tab-aaaa1#02', 10_000),
      connection('ute#tab-aaaa1#03', 10_000),
    ]

    expect(supersededConnections(connections)).toEqual([connections[0]])
  })
})

describe('dropSupersededConnections', () => {
  it("takes a tab's connection out of the group's call once the tab joined anew", async () => {
    service.listParticipants.mockResolvedValue([
      participant('ute#tab-aaaa1#new', 20n),
      participant('ute#tab-aaaa1#old', 10n),
      participant('ute#phone-001#own', 5n),
      participant('udo#tab-bbbb1#his', 15n),
    ])

    await dropSupersededConnections(config, 'g1')

    expect(service.listParticipants).toHaveBeenCalledWith(room)
    expect(service.removeParticipant).toHaveBeenCalledTimes(1)
    expect(service.removeParticipant).toHaveBeenCalledWith(room, 'ute#tab-aaaa1#old')
  })

  it('keeps two devices of the same user in the call', async () => {
    service.listParticipants.mockResolvedValue([
      participant('ute#laptop-01#a', 10n),
      participant('ute#phone-001#b', 20n),
    ])

    await dropSupersededConnections(config, 'g1')

    expect(service.removeParticipant).not.toHaveBeenCalled()
  })

  it('tells the newer of two joins in the same second by the milliseconds', async () => {
    service.listParticipants.mockResolvedValue([
      participant('ute#tab-aaaa1#new', 10n, 10_900n),
      participant('ute#tab-aaaa1#old', 10n, 10_100n),
    ])

    await dropSupersededConnections(config, 'g1')

    expect(removed()).toEqual(['ute#tab-aaaa1#old'])
  })

  it('does nothing without a media server, or in a room it does not have', async () => {
    await dropSupersededConnections({}, 'g1')

    expect(service.listParticipants).not.toHaveBeenCalled()

    service.listParticipants.mockRejectedValue(new TwirpError('not_found', 'gone', 404))
    await dropSupersededConnections(config, 'g1')

    expect(service.removeParticipant).not.toHaveBeenCalled()
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it('never throws', async () => {
    service.listParticipants.mockRejectedValue(new Error('down'))

    await expect(dropSupersededConnections(config, 'g1')).resolves.toBeUndefined()
    expect(mockLogger.warn).toHaveBeenCalled()
  })

  it('keeps both of two joins in the same second where the media server tells no milliseconds', async () => {
    service.listParticipants.mockResolvedValue([
      participant('ute#tab-aaaa1#a', 10n),
      participant('ute#tab-aaaa1#b', 10n),
    ])

    await dropSupersededConnections(config, 'g1')

    expect(service.removeParticipant).not.toHaveBeenCalled()
  })

  it('takes out the others when one of them is already gone', async () => {
    service.listParticipants.mockResolvedValue([
      participant('ute#tab-aaaa1#a', 10n),
      participant('ute#tab-aaaa1#b', 20n),
      participant('ute#tab-aaaa1#c', 30n),
    ])
    service.removeParticipant.mockRejectedValueOnce(new TwirpError('not_found', 'gone', 404))

    await dropSupersededConnections(config, 'g1')

    expect(removed()).toEqual(['ute#tab-aaaa1#a', 'ute#tab-aaaa1#b'])
  })
})
