import { beforeEach, describe, test, expect } from 'vitest'

import type { Mock } from 'vitest'

// vitest has no `isolateModulesAsync`: resetting the registry before the dynamic import does the
// same job, since a module graph is only shared within a file. Wrapped so the call sites keep
// reading as "load this in isolation".
const isolateModules = async (run: () => Promise<void>): Promise<void> => {
  vi.resetModules()
  await run()
}
// Unit tests for addMiddleware – testing append, prepend, before, after, and error cases.
// Each test uses jest.isolateModules + vi.doMock to get a fresh ocelotMiddlewares array.

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
  vi.doMock('./branding/brandingMiddlewares', () => ({ default: vi.fn() }))
  // ESM mock factories must expose `default` themselves — there is no CommonJS interop layer
  // to synthesise one from the object.
  vi.doMock('@config/index', () => ({
    default: { DISABLED_MIDDLEWARES: disabledMiddlewares },
  }))

  // Mock all middlewares and allow to override its mock
  for (const mod of middlewareModules) {
    // eslint-disable-next-line security/detect-object-injection
    vi.doMock(mod, () => ({ default: extraMocks?.[mod] ?? {} }))
  }
}

const loadModule = async (
  options?: MockOptions,
): Promise<{ mod: MiddlewareModule; getCapturedMiddlewares: () => unknown[] }> => {
  // The registry must be dropped BEFORE registering: an already-instantiated ./applyMiddleware
  // keeps the previous factory's closure, and this run's capturedArgs would never be written.
  vi.resetModules()
  let capturedArgs: unknown[] = []
  // ./applyMiddleware, not the package: graphql-middleware is reached through createRequire
  // there (see that file), which bypasses Jest's registry entirely.
  vi.doMock('./applyMiddleware', () => ({
    applyMiddleware: (_schema: unknown, ...middlewares: unknown[]) => {
      capturedArgs = middlewares
      return _schema
    },
  }))
  setupMocks(options)

  const mod = (await import('./index')) as unknown as MiddlewareModule
  return {
    mod,
    getCapturedMiddlewares: () => {
      mod.default({})
      return capturedArgs
    },
  }
}

// Under ESM the mock instances produced by an unstable_mockModule factory survive
// isolateModulesAsync — only the module registry is isolated, not the mocks — so call counts
// would otherwise accumulate across tests.
beforeEach(() => {
  vi.clearAllMocks()
})

describe('default', () => {
  test('registers the 15 default middlewares', async () => {
    await isolateModules(async () => {
      const { getCapturedMiddlewares } = await loadModule()

      expect(getCapturedMiddlewares()).toHaveLength(15)
    })
  })

  test('calls brandingMiddlewares', async () => {
    await isolateModules(async () => {
      const { mod } = await loadModule()

      const { default: brandingMiddlewares } =
        (await import('./branding/brandingMiddlewares')) as unknown as { default: Mock }
      mod.default({})

      expect(brandingMiddlewares).toHaveBeenCalledTimes(1)
    })
  })

  test('filters out disabled middlewares', async () => {
    await isolateModules(async () => {
      const sentryMarker = { __test: 'sentry' }
      const xssMarker = { __test: 'xss' }
      const { getCapturedMiddlewares } = await loadModule({
        extraMocks: {
          './sentryMiddleware': sentryMarker,
          './xssMiddleware': xssMarker,
        },
        disabledMiddlewares: ['sentry', 'xss'],
      })
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const middlewares = getCapturedMiddlewares()

      expect(middlewares).toHaveLength(13)
      expect(middlewares).not.toContain(sentryMarker)
      expect(middlewares).not.toContain(xssMarker)
      expect(consoleSpy).toHaveBeenCalledWith('Warning: Disabled "sentry, xss" middleware.')

      consoleSpy.mockRestore()
    })
  })
})

describe('addMiddleware', () => {
  describe('append', () => {
    test('adds middleware at the end', async () => {
      await isolateModules(async () => {
        const { mod, getCapturedMiddlewares } = await loadModule()
        const m = { __test: 'appended' }
        mod.addMiddleware({ name: 'test-append', middleware: m, position: 'append' })
        const middlewares = getCapturedMiddlewares()

        expect(middlewares).toHaveLength(16)
        expect(middlewares[15]).toBe(m)
      })
    })
  })

  describe('prepend', () => {
    test('adds middleware at the beginning', async () => {
      await isolateModules(async () => {
        const { mod, getCapturedMiddlewares } = await loadModule()
        const m = { __test: 'prepended' }
        mod.addMiddleware({ name: 'test-prepend', middleware: m, position: 'prepend' })
        const middlewares = getCapturedMiddlewares()

        expect(middlewares).toHaveLength(16)
        expect(middlewares[0]).toBe(m)
      })
    })
  })

  describe('before', () => {
    test('inserts middleware directly before the named anchor', async () => {
      await isolateModules(async () => {
        const sentryMarker = { __test: 'sentry' }
        const permissionsMarker = { __test: 'permissions' }
        const { mod, getCapturedMiddlewares } = await loadModule({
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
    test('inserts middleware directly after the named anchor', async () => {
      await isolateModules(async () => {
        const sentryMarker = { __test: 'sentry' }
        const permissionsMarker = { __test: 'permissions' }
        const { mod, getCapturedMiddlewares } = await loadModule({
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
    test('throws when "before" anchor does not exist', async () => {
      await isolateModules(async () => {
        const { mod } = await loadModule()

        expect(() => {
          mod.addMiddleware({
            name: 'failure',
            middleware: {},
            position: { before: 'nonexistent' },
          })
        }).toThrow('Could not find middleware "nonexistent" to append the middleware "failure"')
      })
    })

    test('throws when "after" anchor does not exist', async () => {
      await isolateModules(async () => {
        const { mod } = await loadModule()

        expect(() => {
          mod.addMiddleware({
            name: 'failure',
            middleware: {},
            position: { after: 'nonexistent' },
          })
        }).toThrow('Could not find middleware "nonexistent" to append the middleware "failure"')
      })
    })
  })
})
