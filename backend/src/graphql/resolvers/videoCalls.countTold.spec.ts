import { beforeEach, describe, expect, it } from 'vitest'

// Calls the resolver directly instead of going through the API: what it notes for the poller
// is no business of the schema, the shield or the database, which videoCalls.spec.ts covers.
const listParticipantsMock = vi.fn<(roomName: string) => Promise<unknown[]>>()

vi.mock('livekit-server-sdk', () => ({
  AccessToken: vi.fn(),
  // `function`, not an arrow: the resolver calls `new RoomServiceClient(...)`.
  RoomServiceClient: vi.fn().mockImplementation(function () {
    return {
      listParticipants: async (roomName: string) => listParticipantsMock(roomName),
    }
  }),
  TwirpError: class extends Error {},
}))

const { default: resolvers } = await import('./videoCalls')
const { takeToldRooms } = await import('@src/livekit/toldRooms')

const config = {
  LIVEKIT_URL: 'wss://lk.example.test',
  LIVEKIT_API_KEY: 'k',
  LIVEKIT_API_SECRET: 's',
}

const participantCount = async (groupId: string): Promise<number> =>
  resolvers.Query.videoCallParticipantCount(undefined, { groupId }, { config })

beforeEach(() => {
  listParticipantsMock.mockReset()
  takeToldRooms()
})

describe('videoCallParticipantCount', () => {
  it('notes the room for the poller when it tells a client about a running call', async () => {
    listParticipantsMock.mockResolvedValueOnce([{}])

    await expect(participantCount('g1')).resolves.toBe(1)

    expect(takeToldRooms()).toEqual(new Set(['group-g1']))
  })

  it('notes nothing when nobody is in the call', async () => {
    listParticipantsMock.mockResolvedValueOnce([])

    await expect(participantCount('g1')).resolves.toBe(0)

    expect(takeToldRooms().size).toBe(0)
  })
})
