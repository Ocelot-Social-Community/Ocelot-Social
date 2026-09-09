import { afterEach, beforeEach, describe, it, expect } from 'vitest'

import type { Mock, MockInstance } from 'vitest'

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  withScope: vi.fn(),
  captureException: vi.fn(),
}))

// Imported below the mock registrations — a carry-over from Jest's ESM mode, where the
// registration did not hoist. `vi.mock` does hoist, so a static import would bind the mock too.
const { init, withScope, captureException } = await import('@sentry/node')
const { createSentryMiddleware } = await import('./sentryMiddleware')

const initMock = vi.mocked(init)
// Signature stated: the tests configure this one with mockImplementation, and a bare `vi.fn()`
// would type its argument as `any` instead of checking it against the real callback.
// Cast rather than vi.mocked(withScope): Sentry's real signature is
// `(scope, callback) => unknown`, while the middleware only ever calls the single-argument form
// — typing the stub to what is actually used keeps the implementations below honest.
const withScopeMock = withScope as unknown as Mock<(run: (scope: unknown) => void) => void>
const captureExceptionMock = vi.mocked(captureException)

beforeEach(() => {
  initMock.mockReset()
  withScopeMock.mockReset()
  captureExceptionMock.mockReset()
})

describe('createSentryMiddleware', () => {
  describe('without a DSN', () => {
    it('does not call Sentry.init', () => {
      createSentryMiddleware({})

      expect(initMock).not.toHaveBeenCalled()
    })

    it('returns a passthrough middleware that forwards arguments to resolve', async () => {
      const middleware = createSentryMiddleware({})
      const resolve = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue('result')
      const root = { r: 1 }
      const args = { a: 1 }
      const context = { c: 1 }
      const info = { i: 1 }

      await expect(middleware(resolve, root, args, context, info)).resolves.toBe('result')
      expect(resolve).toHaveBeenCalledWith(root, args, context, info)
      expect(withScopeMock).not.toHaveBeenCalled()
    })

    it('propagates errors from resolve without capturing them', async () => {
      const middleware = createSentryMiddleware({})
      const error = new Error('boom')
      const resolve = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockRejectedValue(error)

      await expect(middleware(resolve, {}, {}, {}, {})).rejects.toBe(error)
      expect(captureExceptionMock).not.toHaveBeenCalled()
    })
  })

  describe('with a DSN', () => {
    it('initializes Sentry with the provided options', () => {
      createSentryMiddleware({
        dsn: 'https://example@sentry.io/1',
        release: 'abc123',
        environment: 'production',
      })

      expect(initMock).toHaveBeenCalledWith({
        dsn: 'https://example@sentry.io/1',
        release: 'abc123',
        environment: 'production',
      })
    })

    it('forwards successful resolver results without reporting', async () => {
      const middleware = createSentryMiddleware({ dsn: 'x' })
      const resolve = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue('ok')

      await expect(middleware(resolve, {}, {}, {}, {})).resolves.toBe('ok')
      expect(withScopeMock).not.toHaveBeenCalled()
      expect(captureExceptionMock).not.toHaveBeenCalled()
    })

    it('captures errors with user and request metadata, then rethrows', async () => {
      const middleware = createSentryMiddleware({ dsn: 'x' })
      const error = new Error('boom')
      const resolve = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockRejectedValue(error)
      const context = {
        user: { id: 'user-42' },
        req: {
          body: { q: '{ me }' },
          headers: { origin: 'https://example.org', 'user-agent': 'jest' },
        },
      }

      const scope = {
        setUser: vi.fn<(...args: unknown[]) => void>(),
        setExtra: vi.fn<(...args: unknown[]) => void>(),
      }
      withScopeMock.mockImplementation((run: (s: typeof scope) => void) => {
        run(scope)
      })

      await expect(middleware(resolve, {}, {}, context, {})).rejects.toBe(error)

      expect(scope.setUser).toHaveBeenCalledWith({ id: 'user-42' })
      expect(scope.setExtra).toHaveBeenCalledWith('body', context.req.body)
      expect(scope.setExtra).toHaveBeenCalledWith('origin', 'https://example.org')
      expect(scope.setExtra).toHaveBeenCalledWith('user-agent', 'jest')
      expect(captureExceptionMock).toHaveBeenCalledWith(error)
    })

    it('handles missing user and request metadata gracefully', async () => {
      const middleware = createSentryMiddleware({ dsn: 'x' })
      const error = new Error('boom')
      const resolve = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockRejectedValue(error)

      const scope = {
        setUser: vi.fn(),
        setExtra: vi.fn(),
      }
      withScopeMock.mockImplementation((run: (s: typeof scope) => void) => {
        run(scope)
      })

      await expect(middleware(resolve, {}, {}, {}, {})).rejects.toBe(error)

      expect(scope.setUser).toHaveBeenCalledWith({ id: undefined })
      expect(scope.setExtra).toHaveBeenCalledWith('body', undefined)
      expect(scope.setExtra).toHaveBeenCalledWith('origin', undefined)
      expect(scope.setExtra).toHaveBeenCalledWith('user-agent', undefined)
      expect(captureExceptionMock).toHaveBeenCalledWith(error)
    })
  })
})

describe('the exported middleware instance', () => {
  interface MockSentryConfig {
    SENTRY_DSN_BACKEND?: string
    COMMIT?: string
    NODE_ENV?: string
    TEST?: boolean
  }

  // The instance is built while the module evaluates, so the only way to observe how CONFIG is
  // wired into it is to re-evaluate the module against a replaced config.
  const loadWithConfig = async (config: MockSentryConfig) => {
    vi.resetModules()
    vi.doMock('@config/index', () => ({ default: config }))
    return import('./sentryMiddleware')
  }

  let logSpy: MockInstance<typeof console.log>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    vi.doUnmock('@config/index')
    vi.resetModules()
  })

  it('reports errors against the deployed commit and environment', async () => {
    await loadWithConfig({
      SENTRY_DSN_BACKEND: 'https://example@sentry.io/2',
      COMMIT: 'deadbeef',
      NODE_ENV: 'production',
      TEST: false,
    })

    // Release and environment are what makes an incoming event attributable to a deployment;
    // mixing up which CONFIG key feeds which would file every production error under the wrong
    // release without any visible symptom.
    expect(initMock).toHaveBeenCalledWith({
      dsn: 'https://example@sentry.io/2',
      release: 'deadbeef',
      environment: 'production',
    })
    expect(logSpy).not.toHaveBeenCalled()
  })

  // A missing DSN means no error reporting at all. Nothing else in the system fails when it is
  // forgotten, so this line is the single signal an operator gets — and it must reach the log
  // even though the middleware itself keeps working.
  it('warns on startup when no DSN is configured', async () => {
    const { default: middleware } = await loadWithConfig({ TEST: false })

    expect(logSpy).toHaveBeenCalledWith('Warning: Sentry middleware inactive.')
    expect(initMock).not.toHaveBeenCalled()

    const resolve = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue('ok')

    await expect(middleware(resolve, {}, {}, {}, {})).resolves.toBe('ok')
  })

  // Every test run would otherwise print the warning once per worker, for a DSN that is absent
  // on purpose.
  it('stays quiet about the missing DSN while testing', async () => {
    await loadWithConfig({ TEST: true })

    expect(logSpy).not.toHaveBeenCalled()
  })
})
