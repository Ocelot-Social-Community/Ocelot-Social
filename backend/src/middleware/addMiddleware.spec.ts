/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable n/global-require */
// Unit tests for addMiddleware – testing append, prepend, before, after, and error cases.
// Each test uses jest.resetModules + jest.doMock to get a fresh ocelotMiddlewares array.

const mockModules = () => {
  jest.mock('./branding/brandingMiddlewares', () => jest.fn())
  jest.mock('./categories', () => ({}))
  jest.mock('./chatMiddleware', () => ({}))
  jest.mock('./excerptMiddleware', () => ({}))
  jest.mock('./hashtags/hashtagsMiddleware', () => ({}))
  jest.mock('./includedFieldsMiddleware', () => ({}))
  jest.mock('./languages/languages', () => ({}))
  jest.mock('./login/loginMiddleware', () => ({}))
  jest.mock('./notifications/notificationsMiddleware', () => ({}))
  jest.mock('./orderByMiddleware', () => ({}))
  jest.mock('./permissionsMiddleware', () => ({}))
  jest.mock('./sentryMiddleware', () => ({}))
  jest.mock('./sluggifyMiddleware', () => ({}))
  jest.mock('./softDelete/softDeleteMiddleware', () => ({}))
  jest.mock('./userInteractions', () => ({}))
  jest.mock('./validation/validationMiddleware', () => ({}))
  jest.mock('./xssMiddleware', () => ({}))
  jest.mock('@config/index', () => ({ DISABLED_MIDDLEWARES: [] }))
}

interface MiddlewareModule {
  addMiddleware: (mw: { name: string; middleware: unknown; position: unknown }) => void
  default: (schema: unknown) => unknown
}

describe('default', () => {
  it('registers the 16 default middlewares', () => {
    let capturedArgs: unknown[] = []
    jest.doMock('graphql-middleware', () => ({
      applyMiddleware: (_schema: unknown, ...middlewares: unknown[]) => {
        capturedArgs = middlewares
        return _schema
      },
    }))
    mockModules()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: applyAll } = require('./index') as MiddlewareModule
    applyAll({})
    expect(capturedArgs).toHaveLength(16)
  })
})

describe('addMiddleware', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  describe('append', () => {
    it('adds middleware at the end', () => {
      let capturedArgs: unknown[] = []
      jest.doMock('graphql-middleware', () => ({
        applyMiddleware: (_schema: unknown, ...middlewares: unknown[]) => {
          capturedArgs = middlewares
          return _schema
        },
      }))
      mockModules()
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { addMiddleware, default: applyAll } = require('./index') as MiddlewareModule
      const m = { __test: 'appended' }
      addMiddleware({ name: 'test-append', middleware: m, position: 'append' })
      applyAll({})
      expect(capturedArgs).toHaveLength(17)
      expect(capturedArgs[16]).toBe(m)
    })
  })

  describe('prepend', () => {
    it('adds middleware at the beginning', () => {
      let capturedArgs: unknown[] = []
      jest.doMock('graphql-middleware', () => ({
        applyMiddleware: (_schema: unknown, ...middlewares: unknown[]) => {
          capturedArgs = middlewares
          return _schema
        },
      }))
      mockModules()
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { addMiddleware, default: applyAll } = require('./index') as MiddlewareModule
      const m = { __test: 'prepended' }
      addMiddleware({ name: 'test-prepend', middleware: m, position: 'prepend' })
      applyAll({})
      expect(capturedArgs).toHaveLength(17)
      expect(capturedArgs[0]).toBe(m)
    })
  })

  describe('before', () => {
    it('inserts middleware directly before the named anchor', () => {
      const sentryMarker = { __test: 'sentry' }
      const permissionsMarker = { __test: 'permissions' }

      jest.doMock('graphql-middleware', () => ({
        applyMiddleware: jest.fn((_schema: unknown, ...middlewares: unknown[]) => _schema),
      }))
      jest.doMock('./sentryMiddleware', () => sentryMarker)
      jest.doMock('./permissionsMiddleware', () => permissionsMarker)
      mockModules()

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { addMiddleware, default: applyAll } = require('./index') as MiddlewareModule
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { applyMiddleware: applyMock } = require('graphql-middleware')

      const m = { __test: 'before-permissions' }
      addMiddleware({
        name: 'test-before-permissions',
        middleware: m,
        position: { before: 'permissions' },
      })

      applyAll({})
      const [, ...middlewares] = (applyMock as jest.Mock).mock.calls[0]
      const idxSentry = middlewares.indexOf(sentryMarker)
      const idxNew = middlewares.indexOf(m)
      const idxPermissions = middlewares.indexOf(permissionsMarker)

      expect(idxSentry).toBeLessThan(idxNew)
      expect(idxNew).toBe(idxPermissions - 1)
    })
  })

  describe('after', () => {
    it('inserts middleware directly after the named anchor', () => {
      const sentryMarker = { __test: 'sentry' }
      const permissionsMarker = { __test: 'permissions' }

      jest.doMock('graphql-middleware', () => ({
        applyMiddleware: jest.fn((_schema: unknown, ...middlewares: unknown[]) => _schema),
      }))
      jest.doMock('./sentryMiddleware', () => sentryMarker)
      jest.doMock('./permissionsMiddleware', () => permissionsMarker)
      mockModules()

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { addMiddleware, default: applyAll } = require('./index') as MiddlewareModule
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { applyMiddleware: applyMock } = require('graphql-middleware')

      const m = { __test: 'after-sentry' }
      addMiddleware({
        name: 'test-after-sentry',
        middleware: m,
        position: { after: 'sentry' },
      })

      applyAll({})
      const [, ...middlewares] = (applyMock as jest.Mock).mock.calls[0]
      const idxSentry = middlewares.indexOf(sentryMarker)
      const idxNew = middlewares.indexOf(m)
      const idxPermissions = middlewares.indexOf(permissionsMarker)

      expect(idxNew).toBe(idxSentry + 1)
      expect(idxNew).toBeLessThan(idxPermissions)
    })
  })

  describe('unknown anchor', () => {
    it('throws when "before" anchor does not exist', () => {
      jest.doMock('graphql-middleware', () => ({
        applyMiddleware: jest.fn(),
      }))
      mockModules()
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { addMiddleware } = require('./index') as MiddlewareModule

      expect(() =>
        addMiddleware({
          name: 'fail',
          middleware: {},
          position: { before: 'nonexistent' },
        }),
      ).toThrow('Could not find middleware "nonexistent" to append the middleware "fail"')
    })

    it('throws when "after" anchor does not exist', () => {
      jest.doMock('graphql-middleware', () => ({
        applyMiddleware: jest.fn(),
      }))
      mockModules()
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { addMiddleware } = require('./index') as MiddlewareModule

      expect(() =>
        addMiddleware({
          name: 'fail2',
          middleware: {},
          position: { after: 'nonexistent' },
        }),
      ).toThrow('Could not find middleware "nonexistent" to append the middleware "fail2"')
    })
  })
})
