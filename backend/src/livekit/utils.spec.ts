import { withTimeout } from './utils'

describe('withTimeout', () => {
  it('resolves with the inner promise value when it settles before the timeout', async () => {
    const value = await withTimeout(Promise.resolve(42), 1000, 'fast')
    expect(value).toBe(42)
  })

  it('rejects with a descriptive timeout error when the inner promise stalls', async () => {
    // eslint-disable-next-line promise/avoid-new
    const slow = new Promise<number>((resolve) => {
      const timer = setTimeout(() => {
        resolve(1)
      }, 1000)
      if (typeof timer.unref === 'function') timer.unref()
    })
    await expect(withTimeout(slow, 20, 'slow')).rejects.toThrow('slow timed out after 20ms')
  })

  it('clears the timeout handle on fast resolution', async () => {
    const setSpy = jest.spyOn(global, 'setTimeout')
    const clearSpy = jest.spyOn(global, 'clearTimeout')
    try {
      const value = await withTimeout(Promise.resolve('done'), 60_000, 'fast')
      expect(value).toBe('done')
      const ourTimer = setSpy.mock.results[setSpy.mock.results.length - 1].value as ReturnType<
        typeof setTimeout
      >
      expect(clearSpy).toHaveBeenCalledWith(ourTimer)
    } finally {
      setSpy.mockRestore()
      clearSpy.mockRestore()
    }
  })

  it('clears the timeout handle on fast rejection', async () => {
    const setSpy = jest.spyOn(global, 'setTimeout')
    const clearSpy = jest.spyOn(global, 'clearTimeout')
    try {
      await expect(withTimeout(Promise.reject(new Error('boom')), 60_000, 'fast')).rejects.toThrow(
        'boom',
      )
      const ourTimer = setSpy.mock.results[setSpy.mock.results.length - 1].value as ReturnType<
        typeof setTimeout
      >
      expect(clearSpy).toHaveBeenCalledWith(ourTimer)
    } finally {
      setSpy.mockRestore()
      clearSpy.mockRestore()
    }
  })
})
