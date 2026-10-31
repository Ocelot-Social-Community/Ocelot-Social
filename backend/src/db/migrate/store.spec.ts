import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Store from './store'

const session = vi.hoisted(() => ({
  run: vi.fn(),
  readTransaction: vi.fn(),
  close: vi.fn(),
}))

vi.mock('@db/neo4j', () => ({
  getDriver: () => ({ session: () => session }),
  closeDriver: vi.fn(),
}))

const init = async () => {
  const errFn = vi.fn()
  await (new Store() as unknown as { init: (next: typeof errFn) => Promise<void> }).init(errFn)
  return errFn
}

describe('migrate init', () => {
  afterEach(() => {
    process.exitCode = undefined
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    session.run.mockReset().mockResolvedValue({ records: [] })
    session.readTransaction.mockReset().mockResolvedValue({ records: [] })
  })

  it('leaves the exit code alone when the schema went in', async () => {
    const errFn = await init()

    expect(errFn).not.toHaveBeenCalled()
    expect(process.exitCode).toBeUndefined()
  })

  it('fails the process when a statement of the schema did not go in', async () => {
    session.run.mockRejectedValue(new Error('Failed to connect to server'))

    const errFn = await init()

    expect(errFn).toHaveBeenCalledTimes(1)
    expect(process.exitCode).toBe(1)
  })

  it('fails the process when the database cannot be reached at all', async () => {
    session.readTransaction.mockRejectedValue(new Error('Failed to connect to server'))

    await init()

    expect(process.exitCode).toBe(1)
  })
})
