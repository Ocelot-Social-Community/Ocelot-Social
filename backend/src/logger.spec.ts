import { afterEach, describe, expect, it, vi } from 'vitest'

// The logger is built ONCE, at import time, from `CONFIG.LOG_LEVEL` — every module that logs
// anything pulls in this module transitively. Both properties tested here are therefore
// process-wide: the level decides what is recorded in production, and the validation decides
// whether a mistyped level fails the boot or silently swallows log output.
//
// Each case re-imports the module with its own config, because the module-level constant is
// evaluated exactly once per module instance.

const importLoggerWith = async (LOG_LEVEL: string) => {
  vi.resetModules()
  vi.doMock('./config', () => ({ default: { LOG_LEVEL } }))
  return (await import('./logger')).default
}

afterEach(() => {
  vi.doUnmock('./config')
  vi.resetModules()
})

describe('logger', () => {
  // tslog filters by NUMBER, so the mapping is what actually decides which calls are printed. A
  // wrong entry would not fail anywhere — it would quietly drop (or flood) production logs.
  it.each([
    ['SILLY', 0],
    ['DEBUG', 2],
    ['INFO', 3],
    ['WARN', 4],
    ['FATAL', 6],
  ])('translates %s into tslog minLevel %i', async (level, expected) => {
    const logger = await importLoggerWith(level)

    expect(logger.settings.minLevel).toBe(expected)
  })

  // Fails at boot rather than at the first log call: an unknown level has no number, and passing
  // `undefined` as minLevel would leave the process running with a logger nobody configured.
  it.each(['', 'verbose', 'debug'])('refuses to start with LOG_LEVEL %s', async (level) => {
    await expect(importLoggerWith(level)).rejects.toThrow(`Unknown log level '${level}'`)
  })

  // One instance for the whole process — the name is what identifies its output, and repeated
  // imports must not each build their own logger with its own transports.
  it('is a single named instance', async () => {
    const first = (await import('./logger')).default
    const second = (await import('./logger')).default

    expect(first).toBe(second)
    expect(first.settings.name).toBe('mainLogger')
  })
})
