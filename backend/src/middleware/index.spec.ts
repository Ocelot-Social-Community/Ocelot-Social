/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable n/global-require */

// Unit tests for addMiddleware – testing append, prepend, before, after, and error cases.
// Each test uses jest.isolateModules + jest.doMock to get a fresh ocelotMiddlewares array.

interface MiddlewareModule {
  addMiddleware: (mw: { name: string; middleware: unknown; position: unknown }) => void
  default: (schema: unknown) => unknown
}

interface MockOptions {
  extraMocks?: Record<string, unknown>
  disabledMiddlewares?: string[]
}

const middlewareModules = [
  './categories',
  './chatMiddleware',
  './excerptMiddleware',
  './hashtags/hashtagsMiddleware',
  './includedFieldsMiddleware',
  './languages/languages',
  './login/loginMiddleware',
  './notifications/notificationsMiddleware',
  './orderByMiddleware',
  './permissionsMiddleware',
  './sentryMiddleware',
  './sluggifyMiddleware',
  './softDelete/softDeleteMiddleware',
  './userInteractions',
  './validation/validationMiddleware',
  './xssMiddleware',
]

const setupMocks = ({ extraMocks, disabledMiddlewares = [] }: MockOptions = {}) => {
  jest.doMock('./branding/brandingMiddlewares', () => jest.fn())
  jest.doMock('@config/index', () => ({ DISABLED_MIDDLEWARES: disabledMiddlewares }))

  // Mock all middlewares and allow to override its mock
  for (const mod of middlewareModules) {
    // eslint-disable-next-line security/detect-object-injection
    jest.doMock(mod, () => extraMocks?.[mod] ?? {})
  }
}

const loadModule = (
  options?: MockOptions,
): { mod: MiddlewareModule; getCapturedMiddlewares: () => unknown[] } => {
  let capturedArgs: unknown[] = []
  jest.doMock('graphql-middleware', () => ({
    applyMiddleware: (_schema: unknown, ...middlewares: unknown[]) => {
      capturedArgs = middlewares
      return _schema
    },
  }))
  setupMocks(options)
  // eslint-disable-next-line n/no-missing-require
  const mod = require('./index') as MiddlewareModule
  return {
    mod,
    getCapturedMiddlewares: () => {
      mod.default({})
      return capturedArgs
    },
  }
}

describe('default', () => {
  it('registers the 16 default middlewares', () => {
    jest.isolateModules(() => {
      const { getCapturedMiddlewares } = loadModule()
      expect(getCapturedMiddlewares()).toHaveLength(16)
    })
  })

  it('calls brandingMiddlewares', () => {
    jest.isolateModules(() => {
      const { mod } = loadModule()
      // eslint-disable-next-line n/no-missing-require
      const brandingMiddlewares = require('./branding/brandingMiddlewares') as jest.Mock
      mod.default({})
      expect(brandingMiddlewares).toHaveBeenCalledTimes(1)
    })
  })

  it('filters out disabled middlewares', () => {
    jest.isolateModules(() => {
      const sentryMarker = { __test: 'sentry' }
      const xssMarker = { __test: 'xss' }
      const { getCapturedMiddlewares } = loadModule({
        extraMocks: {
          './sentryMiddleware': sentryMarker,
          './xssMiddleware': xssMarker,
        },
        disabledMiddlewares: ['sentry', 'xss'],
      })
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const middlewares = getCapturedMiddlewares()
      expect(middlewares).toHaveLength(14)
      expect(middlewares).not.toContain(sentryMarker)
      expect(middlewares).not.toContain(xssMarker)
      expect(consoleSpy).toHaveBeenCalledWith('Warning: Disabled "sentry, xss" middleware.')
      consoleSpy.mockRestore()
    })
  })
})

describe('addMiddleware', () => {
  describe('append', () => {
    it('adds middleware at the end', () => {
      jest.isolateModules(() => {
        const { mod, getCapturedMiddlewares } = loadModule()
        const m = { __test: 'appended' }
        mod.addMiddleware({ name: 'test-append', middleware: m, position: 'append' })
        const middlewares = getCapturedMiddlewares()
        expect(middlewares).toHaveLength(17)
        expect(middlewares[16]).toBe(m)
      })
    })
  })

  describe('prepend', () => {
    it('adds middleware at the beginning', () => {
      jest.isolateModules(() => {
        const { mod, getCapturedMiddlewares } = loadModule()
        const m = { __test: 'prepended' }
        mod.addMiddleware({ name: 'test-prepend', middleware: m, position: 'prepend' })
        const middlewares = getCapturedMiddlewares()
        expect(middlewares).toHaveLength(17)
        expect(middlewares[0]).toBe(m)
      })
    })
  })

  describe('before', () => {
    it('inserts middleware directly before the named anchor', () => {
      jest.isolateModules(() => {
        const sentryMarker = { __test: 'sentry' }
        const permissionsMarker = { __test: 'permissions' }
        const { mod, getCapturedMiddlewares } = loadModule({
          extraMocks: {
            './sentryMiddleware': sentryMarker,
            './permissionsMiddleware': permissionsMarker,
          },
        })

        const m = { __test: 'before-permissions' }
        mod.addMiddleware({
          name: 'test-before-permissions',
          middleware: m,
          position: { before: 'permissions' },
        })

        const middlewares = getCapturedMiddlewares()
        const idxSentry = middlewares.indexOf(sentryMarker)
        const idxNew = middlewares.indexOf(m)
        const idxPermissions = middlewares.indexOf(permissionsMarker)

        expect(idxSentry).toBeLessThan(idxNew)
        expect(idxNew).toBe(idxPermissions - 1)
      })
    })
  })

  describe('after', () => {
    it('inserts middleware directly after the named anchor', () => {
      jest.isolateModules(() => {
        const sentryMarker = { __test: 'sentry' }
        const permissionsMarker = { __test: 'permissions' }
        const { mod, getCapturedMiddlewares } = loadModule({
          extraMocks: {
            './sentryMiddleware': sentryMarker,
            './permissionsMiddleware': permissionsMarker,
          },
        })

        const m = { __test: 'after-sentry' }
        mod.addMiddleware({
          name: 'test-after-sentry',
          middleware: m,
          position: { after: 'sentry' },
        })

        const middlewares = getCapturedMiddlewares()
        const idxSentry = middlewares.indexOf(sentryMarker)
        const idxNew = middlewares.indexOf(m)
        const idxPermissions = middlewares.indexOf(permissionsMarker)

        expect(idxNew).toBe(idxSentry + 1)
        expect(idxNew).toBeLessThan(idxPermissions)
      })
    })
  })

  describe('unknown anchor', () => {
    it('throws when "before" anchor does not exist', () => {
      jest.isolateModules(() => {
        const { mod } = loadModule()
        expect(() =>
          mod.addMiddleware({
            name: 'failure',
            middleware: {},
            position: { before: 'nonexistent' },
          }),
        ).toThrow('Could not find middleware "nonexistent" to append the middleware "failure"')
      })
    })

    it('throws when "after" anchor does not exist', () => {
      jest.isolateModules(() => {
        const { mod } = loadModule()
        expect(() =>
          mod.addMiddleware({
            name: 'failure',
            middleware: {},
            position: { after: 'nonexistent' },
          }),
        ).toThrow('Could not find middleware "nonexistent" to append the middleware "failure"')
      })
    })
  })
})
