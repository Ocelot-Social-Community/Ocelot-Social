import { withTimeout } from './utils'

describe('withTimeout', () => {
  it('resolves with the inner promise value when it settles before the timeout', async () => {
    const value = await withTimeout(Promise.resolve(42), 1000, 'fast')
    expect(value).toBe(42)
  })

  it('rejects with a descriptive timeout error when the inner promise stalls', async () => {
    // eslint-disable-next-line promise/avoid-new
    const slow = new Promise<number>((resolve) => {
      const timer = setTimeout(() => resolve(1), 1000)
      if (typeof timer.unref === 'function') timer.unref()
    })
    await expect(withTimeout(slow, 20, 'slow')).rejects.toThrow('slow timed out after 20ms')
  })
})
