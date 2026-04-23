import { init, withScope, captureException } from '@sentry/node'

import { createSentryMiddleware } from './sentryMiddleware'

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  withScope: jest.fn(),
  captureException: jest.fn(),
}))

const initMock = init as jest.Mock
const withScopeMock = withScope as jest.Mock
const captureExceptionMock = captureException as jest.Mock

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
      const resolve = jest.fn().mockResolvedValue('result')
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
      const resolve = jest.fn().mockRejectedValue(error)

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
      const resolve = jest.fn().mockResolvedValue('ok')

      await expect(middleware(resolve, {}, {}, {}, {})).resolves.toBe('ok')
      expect(withScopeMock).not.toHaveBeenCalled()
      expect(captureExceptionMock).not.toHaveBeenCalled()
    })

    it('captures errors with user and request metadata, then rethrows', async () => {
      const middleware = createSentryMiddleware({ dsn: 'x' })
      const error = new Error('boom')
      const resolve = jest.fn().mockRejectedValue(error)
      const context = {
        user: { id: 'user-42' },
        req: {
          body: { q: '{ me }' },
          headers: { origin: 'https://example.org', 'user-agent': 'jest' },
        },
      }

      const scope = {
        setUser: jest.fn(),
        setExtra: jest.fn(),
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
      const resolve = jest.fn().mockRejectedValue(error)

      const scope = {
        setUser: jest.fn(),
        setExtra: jest.fn(),
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
