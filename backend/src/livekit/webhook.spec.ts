/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, it, expect } from 'vitest'

const mockConfig: {
  LIVEKIT_ENABLED: boolean
  LIVEKIT_URL?: string
  LIVEKIT_API_KEY?: string
  LIVEKIT_API_SECRET?: string
} = { LIVEKIT_ENABLED: false }

const mockReceive = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const mockWebhookReceiverCtor = vi.fn()

// `function`, not an arrow: this stands in for a CLASS and the code under test calls it with
// `new`. Vitest constructs the mock's implementation via Reflect.construct, and an arrow is
// not a constructor — Jest applied the implementation instead, so arrows worked there.
vi.mock('livekit-server-sdk', () => ({
  WebhookReceiver: vi.fn().mockImplementation(function (...args: unknown[]) {
    mockWebhookReceiverCtor(...args)
    return { receive: async (...inner: unknown[]) => mockReceive(...inner) }
  }),
}))

const mockPublish = vi.fn()
vi.mock('@src/context', () => ({
  __esModule: true,
  serverPubsub: { publish: (...args: unknown[]) => mockPublish(...args) },
}))

const mockGetCount = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('@src/graphql/resolvers/videoCalls', () => ({
  __esModule: true,
  getLiveParticipantCount: async (...args: unknown[]) => mockGetCount(...args),
  groupIdFromRoomName: (roomName: string | null | undefined): string | null =>
    roomName?.startsWith('group-') ? roomName.slice('group-'.length) : null,
}))

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
// jest.mock factories are hoisted above the const/let declarations they
// reference, so `default: mockLogger` / `default: mockConfig` would read a
// TDZ-locked binding when webhook.ts is required. Expose them through
// getters so the binding is only read when the consuming code actually
// touches the imported default — by which time the test file has finished
// initializing.
vi.mock('@src/logger', () => ({
  __esModule: true,
  get default() {
    return mockLogger
  },
}))

vi.mock('@src/config', () => ({
  __esModule: true,
  get default() {
    return mockConfig
  },
}))

// Imported after the mock registrations, not above them: `unstable_mockModule`
// does not hoist, so a static import would bind the real module first.
const { registerLiveKitWebhook } = await import('./webhook')

type CapturedHandler = (req: any, res: any) => void

function makeApp() {
  const handlers: { path: string; handler: CapturedHandler }[] = []
  const post = vi.fn((path: string, _parser: unknown, handler: CapturedHandler) => {
    handlers.push({ path, handler })
  })
  return { post, handlers }
}

function makeRes() {
  const res: any = { headersSent: false }
  vi.spyOn(res, 'status').mockImplementation(() => res)
  vi.spyOn(res, 'send').mockImplementation(() => res)
  vi.spyOn(res, 'end').mockImplementation(() => res)
  return res
}

function makeReq(opts: { authHeader?: string; body?: Buffer | string }) {
  return {
    get: vi.fn((name: string) => (name === 'Authorization' ? opts.authHeader : undefined)),
    body: opts.body,
  }
}

const flushPromises = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve()
  }
}

const setEnabledConfig = () => {
  mockConfig.LIVEKIT_ENABLED = true
  mockConfig.LIVEKIT_URL = 'wss://lk.example.test'
  mockConfig.LIVEKIT_API_KEY = 'key'
  mockConfig.LIVEKIT_API_SECRET = 'secret'
}

const registerAndCapture = () => {
  const app = makeApp()
  registerLiveKitWebhook(app as any)
  return { app, handler: app.handlers[0]?.handler }
}

beforeEach(() => {
  mockConfig.LIVEKIT_ENABLED = false
  mockConfig.LIVEKIT_URL = undefined
  mockConfig.LIVEKIT_API_KEY = undefined
  mockConfig.LIVEKIT_API_SECRET = undefined
  mockReceive.mockReset()
  mockWebhookReceiverCtor.mockReset()
  mockPublish.mockReset().mockResolvedValue(undefined)
  mockGetCount.mockReset().mockResolvedValue(0)
  mockLogger.info.mockReset()
  mockLogger.warn.mockReset()
  mockLogger.error.mockReset()
})

describe('registerLiveKitWebhook', () => {
  it('does nothing when LiveKit is disabled', () => {
    const { app } = registerAndCapture()

    expect(app.post).not.toHaveBeenCalled()
    expect(mockLogger.info).not.toHaveBeenCalled()
  })

  it('does nothing when LiveKit env is incomplete', () => {
    mockConfig.LIVEKIT_ENABLED = true
    mockConfig.LIVEKIT_URL = 'wss://lk.example.test'
    // missing API key/secret
    const { app } = registerAndCapture()

    expect(app.post).not.toHaveBeenCalled()
  })

  it('registers the webhook route once LiveKit is configured', () => {
    setEnabledConfig()
    const { app } = registerAndCapture()

    expect(app.post).toHaveBeenCalledTimes(1)
    expect(app.post.mock.calls[0][0]).toBe('/livekit/webhook')
    expect(mockWebhookReceiverCtor).toHaveBeenCalledWith('key', 'secret')
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('/livekit/webhook'))
  })

  describe('webhook handler', () => {
    let handler: CapturedHandler

    beforeEach(() => {
      setEnabledConfig()
      handler = registerAndCapture().handler
    })

    it('returns 401 when Authorization header is missing', async () => {
      const req = makeReq({ body: Buffer.from('payload') })
      const res = makeRes()
      handler(req, res)
      await flushPromises()

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.send).toHaveBeenCalledWith('Missing Authorization header')
      expect(mockReceive).not.toHaveBeenCalled()
    })

    it('returns 400 when body is missing', async () => {
      const req = makeReq({ authHeader: 'sig' })
      const res = makeRes()
      handler(req, res)
      await flushPromises()

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.send).toHaveBeenCalledWith('Missing body')
    })

    it('returns 401 when signature verification fails', async () => {
      mockReceive.mockRejectedValueOnce(new Error('bad sig'))
      const req = makeReq({ authHeader: 'sig', body: Buffer.from('payload') })
      const res = makeRes()
      handler(req, res)
      await flushPromises()

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.send).toHaveBeenCalledWith('Invalid signature')
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('returns 204 and ignores events for rooms outside the group- namespace', async () => {
      mockReceive.mockResolvedValueOnce({
        event: 'participant_joined',
        room: { name: 'other-room' },
      })
      const req = makeReq({ authHeader: 'sig', body: Buffer.from('p') })
      const res = makeRes()
      handler(req, res)
      await flushPromises()

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
      expect(mockPublish).not.toHaveBeenCalled()
    })

    it('returns 204 when the event has no room', async () => {
      mockReceive.mockResolvedValueOnce({ event: 'participant_joined' })
      const req = makeReq({ authHeader: 'sig', body: Buffer.from('p') })
      const res = makeRes()
      handler(req, res)
      await flushPromises()

      expect(res.status).toHaveBeenCalledWith(204)
      expect(mockPublish).not.toHaveBeenCalled()
    })

    it('publishes live participant count for participant_joined', async () => {
      mockReceive.mockResolvedValueOnce({
        event: 'participant_joined',
        room: { name: 'group-abc' },
      })
      mockGetCount.mockResolvedValueOnce(3)
      const req = makeReq({ authHeader: 'sig', body: Buffer.from('p') })
      const res = makeRes()
      handler(req, res)
      await flushPromises()

      expect(mockGetCount).toHaveBeenCalledWith(
        {
          LIVEKIT_URL: 'wss://lk.example.test',
          LIVEKIT_API_KEY: 'key',
          LIVEKIT_API_SECRET: 'secret',
        },
        'group-abc',
      )
      expect(mockPublish).toHaveBeenCalledWith('VIDEO_CALL_PARTICIPANT_COUNT_CHANGED', {
        groupId: 'abc',
        count: 3,
      })
      expect(res.status).toHaveBeenCalledWith(204)
    })

    it.each([['participant_left'], ['room_started']])(
      'publishes live count for %s',
      async (eventName) => {
        mockReceive.mockResolvedValueOnce({
          event: eventName,
          room: { name: 'group-xyz' },
        })
        mockGetCount.mockResolvedValueOnce(1)
        const req = makeReq({ authHeader: 'sig', body: Buffer.from('p') })
        const res = makeRes()
        handler(req, res)
        await flushPromises()

        expect(mockPublish).toHaveBeenCalledWith('VIDEO_CALL_PARTICIPANT_COUNT_CHANGED', {
          groupId: 'xyz',
          count: 1,
        })
      },
    )

    it('publishes count 0 for room_finished without calling LiveKit API', async () => {
      mockReceive.mockResolvedValueOnce({
        event: 'room_finished',
        room: { name: 'group-finished' },
      })
      const req = makeReq({ authHeader: 'sig', body: Buffer.from('p') })
      const res = makeRes()
      handler(req, res)
      await flushPromises()

      expect(mockGetCount).not.toHaveBeenCalled()
      expect(mockPublish).toHaveBeenCalledWith('VIDEO_CALL_PARTICIPANT_COUNT_CHANGED', {
        groupId: 'finished',
        count: 0,
      })
      expect(res.status).toHaveBeenCalledWith(204)
    })

    it('ignores unrelated event names', async () => {
      mockReceive.mockResolvedValueOnce({
        event: 'track_published',
        room: { name: 'group-noop' },
      })
      const req = makeReq({ authHeader: 'sig', body: Buffer.from('p') })
      const res = makeRes()
      handler(req, res)
      await flushPromises()

      expect(mockPublish).not.toHaveBeenCalled()
      expect(mockGetCount).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(204)
    })

    it('logs but does not throw when publishCount fails', async () => {
      mockReceive.mockResolvedValueOnce({
        event: 'participant_joined',
        room: { name: 'group-abc' },
      })
      mockGetCount.mockRejectedValueOnce(new Error('upstream down'))
      const req = makeReq({ authHeader: 'sig', body: Buffer.from('p') })
      const res = makeRes()
      handler(req, res)
      await flushPromises()

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to publish'),
        expect.any(Error),
      )
      expect(res.status).toHaveBeenCalledWith(204)
    })

    it('returns 500 when the handler hits an unexpected error', async () => {
      const req: any = {
        get: vi.fn(() => {
          throw new Error('unexpected')
        }),
        body: Buffer.from('p'),
      }
      const res = makeRes()
      handler(req, res)
      await flushPromises()

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected LiveKit webhook handler error'),
        expect.any(Error),
      )
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.end).toHaveBeenCalled()
    })

    it('does not write a second response when headers were already sent', async () => {
      const req: any = {
        get: vi.fn(() => {
          throw new Error('unexpected')
        }),
        body: Buffer.from('p'),
      }
      const res = makeRes()
      res.headersSent = true
      handler(req, res)
      await flushPromises()

      expect(res.status).not.toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })
})

// No imports left after the vitest switch — without this the file is a script, not a
// module: its top-level consts would collide across specs and `await` would be illegal.
