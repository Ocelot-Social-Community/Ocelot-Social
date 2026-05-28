/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { startLiveKitPoller, stopLiveKitPoller } from './poller'

const mockConfig: {
  LIVEKIT_ENABLED: boolean
  LIVEKIT_URL?: string
  LIVEKIT_API_KEY?: string
  LIVEKIT_API_SECRET?: string
} = { LIVEKIT_ENABLED: false }

const mockListRooms = jest.fn()
const mockRoomServiceCtor = jest.fn()

jest.mock('livekit-server-sdk', () => ({
  RoomServiceClient: jest.fn().mockImplementation((...args: unknown[]) => {
    mockRoomServiceCtor(...args)
    return {
      listRooms: (...inner: unknown[]): unknown => mockListRooms(...inner) as unknown,
    }
  }),
}))

const mockPublish = jest.fn()
jest.mock('@src/context', () => ({
  __esModule: true,
  serverPubsub: {
    publish: (...args: unknown[]): unknown => mockPublish(...args) as unknown,
  },
}))

jest.mock('@src/graphql/resolvers/videoCalls', () => ({
  __esModule: true,
  groupIdFromRoomName: (roomName: string | null | undefined): string | null =>
    roomName?.startsWith('group-') ? roomName.slice('group-'.length) : null,
}))

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
jest.mock('@src/logger', () => ({ __esModule: true, default: mockLogger }))

jest.mock('@src/config', () => ({ __esModule: true, default: mockConfig }))

const setEnabled = () => {
  mockConfig.LIVEKIT_ENABLED = true
  mockConfig.LIVEKIT_URL = 'wss://lk.example.test'
  mockConfig.LIVEKIT_API_KEY = 'key'
  mockConfig.LIVEKIT_API_SECRET = 'secret'
}

beforeEach(() => {
  jest.useFakeTimers()
  mockConfig.LIVEKIT_ENABLED = false
  mockConfig.LIVEKIT_URL = undefined
  mockConfig.LIVEKIT_API_KEY = undefined
  mockConfig.LIVEKIT_API_SECRET = undefined
  mockListRooms.mockReset().mockResolvedValue([])
  mockRoomServiceCtor.mockReset()
  mockPublish.mockReset().mockResolvedValue(undefined)
  mockLogger.info.mockReset()
  mockLogger.warn.mockReset()
  mockLogger.error.mockReset()
})

afterEach(() => {
  stopLiveKitPoller()
  jest.useRealTimers()
})

describe('startLiveKitPoller', () => {
  it('does nothing when LiveKit is disabled', () => {
    startLiveKitPoller()
    expect(mockRoomServiceCtor).not.toHaveBeenCalled()
    expect(mockLogger.info).not.toHaveBeenCalled()
  })

  it('does nothing when config is incomplete', () => {
    mockConfig.LIVEKIT_ENABLED = true
    mockConfig.LIVEKIT_URL = 'wss://lk.example.test'
    // missing key/secret
    startLiveKitPoller()
    expect(mockRoomServiceCtor).not.toHaveBeenCalled()
  })

  it('creates a RoomServiceClient with http url and starts the timers', () => {
    setEnabled()
    startLiveKitPoller()
    expect(mockRoomServiceCtor).toHaveBeenCalledWith('https://lk.example.test', 'key', 'secret')
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('LiveKit poller starting'))
  })

  it('is idempotent — calling start twice does not create a second client', () => {
    setEnabled()
    startLiveKitPoller()
    startLiveKitPoller()
    expect(mockRoomServiceCtor).toHaveBeenCalledTimes(1)
  })

  it('rewrites ws:// to http:// for the REST client', () => {
    mockConfig.LIVEKIT_ENABLED = true
    mockConfig.LIVEKIT_URL = 'ws://plain.test'
    mockConfig.LIVEKIT_API_KEY = 'k'
    mockConfig.LIVEKIT_API_SECRET = 's'
    startLiveKitPoller()
    expect(mockRoomServiceCtor).toHaveBeenCalledWith('http://plain.test', 'k', 's')
  })

  it('leaves https:// and http:// urls untouched', () => {
    mockConfig.LIVEKIT_ENABLED = true
    mockConfig.LIVEKIT_URL = 'https://already.test'
    mockConfig.LIVEKIT_API_KEY = 'k'
    mockConfig.LIVEKIT_API_SECRET = 's'
    startLiveKitPoller()
    expect(mockRoomServiceCtor).toHaveBeenCalledWith('https://already.test', 'k', 's')
  })
})

describe('poll tick', () => {
  beforeEach(() => {
    setEnabled()
  })

  it('publishes participant counts only for group- rooms and only on change', async () => {
    mockListRooms.mockResolvedValueOnce([
      { name: 'group-a', numParticipants: 2 },
      { name: 'group-b', numParticipants: 0 },
      { name: 'other', numParticipants: 5 },
    ])
    startLiveKitPoller()
    await jest.advanceTimersByTimeAsync(5_000)

    expect(mockListRooms).toHaveBeenCalledTimes(1)
    expect(mockPublish).toHaveBeenCalledWith('VIDEO_CALL_PARTICIPANT_COUNT_CHANGED', {
      groupId: 'a',
      count: 2,
    })
    expect(mockPublish).toHaveBeenCalledWith('VIDEO_CALL_PARTICIPANT_COUNT_CHANGED', {
      groupId: 'b',
      count: 0,
    })
    expect(mockPublish).not.toHaveBeenCalledWith(
      'VIDEO_CALL_PARTICIPANT_COUNT_CHANGED',
      expect.objectContaining({ groupId: expect.stringContaining('other') }),
    )

    // Second tick with identical counts: no new publishes
    mockPublish.mockClear()
    mockListRooms.mockResolvedValueOnce([
      { name: 'group-a', numParticipants: 2 },
      { name: 'group-b', numParticipants: 0 },
    ])
    await jest.advanceTimersByTimeAsync(15_000)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('publishes count: 0 for rooms that disappeared from the list', async () => {
    mockListRooms.mockResolvedValueOnce([{ name: 'group-a', numParticipants: 3 }])
    startLiveKitPoller()
    await jest.advanceTimersByTimeAsync(5_000)
    mockPublish.mockClear()

    mockListRooms.mockResolvedValueOnce([])
    await jest.advanceTimersByTimeAsync(15_000)
    expect(mockPublish).toHaveBeenCalledWith('VIDEO_CALL_PARTICIPANT_COUNT_CHANGED', {
      groupId: 'a',
      count: 0,
    })

    // Third tick: the disappeared entry has been pruned, no further publish
    mockPublish.mockClear()
    mockListRooms.mockResolvedValueOnce([])
    await jest.advanceTimersByTimeAsync(15_000)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('does not emit a duplicate zero when the disappeared room was already at 0', async () => {
    mockListRooms.mockResolvedValueOnce([{ name: 'group-a', numParticipants: 0 }])
    startLiveKitPoller()
    await jest.advanceTimersByTimeAsync(5_000)
    mockPublish.mockClear()

    mockListRooms.mockResolvedValueOnce([])
    await jest.advanceTimersByTimeAsync(15_000)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('coerces undefined numParticipants to 0', async () => {
    mockListRooms.mockResolvedValueOnce([{ name: 'group-a' }])
    startLiveKitPoller()
    await jest.advanceTimersByTimeAsync(5_000)
    expect(mockPublish).toHaveBeenCalledWith('VIDEO_CALL_PARTICIPANT_COUNT_CHANGED', {
      groupId: 'a',
      count: 0,
    })
  })

  it('warns on listRooms failures and goes quiet after 3 consecutive errors', async () => {
    mockListRooms.mockRejectedValue(new Error('lk unreachable'))
    startLiveKitPoller()
    await jest.advanceTimersByTimeAsync(5_000)
    await jest.advanceTimersByTimeAsync(15_000)
    await jest.advanceTimersByTimeAsync(15_000)
    await jest.advanceTimersByTimeAsync(15_000)
    expect(mockListRooms).toHaveBeenCalledTimes(4)
    // First 3 failures logged, 4th suppressed
    expect(mockLogger.warn).toHaveBeenCalledTimes(3)
  })

  it('resets the failure counter once a poll succeeds again', async () => {
    mockListRooms.mockRejectedValueOnce(new Error('boom1'))
    startLiveKitPoller()
    await jest.advanceTimersByTimeAsync(5_000)
    expect(mockLogger.warn).toHaveBeenCalledTimes(1)
    expect(mockLogger.warn.mock.calls[0][0]).toContain('#1')

    mockListRooms.mockResolvedValueOnce([])
    await jest.advanceTimersByTimeAsync(15_000)

    mockListRooms.mockRejectedValueOnce(new Error('boom2'))
    await jest.advanceTimersByTimeAsync(15_000)
    // Should be back to "#1" after the success reset
    const calls = mockLogger.warn.mock.calls
    const lastWarn = calls[calls.length - 1] as unknown[]
    expect(lastWarn[0]).toContain('#1')
  })

  it('catches errors thrown synchronously in pollOnce inside runTick', async () => {
    // Force a publish error so the outer runTick try/catch kicks in
    mockListRooms.mockResolvedValueOnce([{ name: 'group-a', numParticipants: 1 }])
    mockPublish.mockRejectedValueOnce(new Error('pubsub down'))
    startLiveKitPoller()
    await jest.advanceTimersByTimeAsync(5_000)
    expect(mockLogger.warn).toHaveBeenCalledWith('LiveKit poll tick failed:', 'pubsub down')
  })
})

describe('stopLiveKitPoller', () => {
  it('cancels the initial timer before it fires', async () => {
    setEnabled()
    startLiveKitPoller()
    stopLiveKitPoller()
    await jest.advanceTimersByTimeAsync(5_000)
    expect(mockListRooms).not.toHaveBeenCalled()
  })

  it('cancels the recurring interval', async () => {
    setEnabled()
    startLiveKitPoller()
    await jest.advanceTimersByTimeAsync(5_000)
    mockListRooms.mockClear()
    stopLiveKitPoller()
    await jest.advanceTimersByTimeAsync(60_000)
    expect(mockListRooms).not.toHaveBeenCalled()
  })

  it('can be called when no poller is running', () => {
    expect(() => {
      stopLiveKitPoller()
    }).not.toThrow()
  })
})
