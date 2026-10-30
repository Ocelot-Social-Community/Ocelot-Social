import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CACHE_RESYNC_INTERVAL_MS, startCacheResync, stopCacheResync } from './cacheResync'

const policyResync = vi.fn<() => Promise<void>>()
const roleResync = vi.fn<() => Promise<void>>()
const warn = vi.fn<(...args: unknown[]) => void>()

vi.mock('@src/policy', () => ({ getPolicyService: () => ({ resync: policyResync }) }))
vi.mock('@src/role', () => ({ getRoleService: () => ({ resync: roleResync }) }))
vi.mock('@src/logger', () => ({
  default: {
    warn: (...args: unknown[]) => {
      warn(...args)
    },
  },
}))

describe('cacheResync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    policyResync.mockResolvedValue()
    roleResync.mockResolvedValue()
  })

  afterEach(() => {
    stopCacheResync()
    vi.useRealTimers()
  })

  it('resyncs both caches once per interval, not before', async () => {
    startCacheResync()

    await vi.advanceTimersByTimeAsync(CACHE_RESYNC_INTERVAL_MS - 1)

    expect(policyResync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)

    expect(policyResync).toHaveBeenCalledTimes(1)
    expect(roleResync).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(CACHE_RESYNC_INTERVAL_MS)

    expect(policyResync).toHaveBeenCalledTimes(2)
    expect(roleResync).toHaveBeenCalledTimes(2)
  })

  it('still resyncs the roles when the policy fails, and tries again next time', async () => {
    const error = new Error('neo4j is away')
    policyResync.mockRejectedValueOnce(error)
    startCacheResync()

    await vi.advanceTimersByTimeAsync(CACHE_RESYNC_INTERVAL_MS)

    expect(roleResync).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.any(String), error)

    await vi.advanceTimersByTimeAsync(CACHE_RESYNC_INTERVAL_MS)

    expect(policyResync).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('stops', async () => {
    startCacheResync()
    stopCacheResync()

    await vi.advanceTimersByTimeAsync(CACHE_RESYNC_INTERVAL_MS)

    expect(policyResync).not.toHaveBeenCalled()
  })

  it('does not mind being stopped without having started', () => {
    expect(() => {
      stopCacheResync()
    }).not.toThrow()
  })
})
