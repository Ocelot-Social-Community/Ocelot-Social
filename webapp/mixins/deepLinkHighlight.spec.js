import deepLinkHighlight, { HIGHLIGHT_DURATION_MS } from './deepLinkHighlight.js'

// The mixin drives component state/lifecycle via `this`, so it is exercised by calling its
// hooks against a minimal fake context rather than mounting a whole page. $nextTick runs
// its callback synchronously so the scroll assertion is deterministic.
const makeContext = ({ hash = '', keys = [] } = {}) => ({
  ...deepLinkHighlight.data(),
  $route: { hash },
  $nextTick: (cb) => cb(),
  highlightableKeys: () => keys,
  applyHashHighlight: deepLinkHighlight.methods.applyHashHighlight,
})

describe('deepLinkHighlight mixin', () => {
  let element

  beforeEach(() => {
    jest.useFakeTimers()
    element = { scrollIntoView: jest.fn() }
    jest.spyOn(document, 'getElementById').mockReturnValue(element)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('starts with no highlighted key', () => {
    expect(deepLinkHighlight.data()).toEqual({ highlightedKey: null })
  })

  it('has no highlightable keys by default (components override it)', () => {
    expect(deepLinkHighlight.methods.highlightableKeys()).toEqual([])
  })

  describe('applyHashHighlight', () => {
    it('highlights and scrolls to the row when the hash matches a highlightable key', () => {
      const ctx = makeContext({ hash: '#foo', keys: ['foo', 'bar'] })
      ctx.applyHashHighlight()
      expect(ctx.highlightedKey).toBe('foo')
      expect(document.getElementById).toHaveBeenCalledWith('foo')
      expect(element.scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
    })

    it('fades the highlight out after the highlight duration', () => {
      const ctx = makeContext({ hash: '#foo', keys: ['foo'] })
      ctx.applyHashHighlight()
      expect(ctx.highlightedKey).toBe('foo')
      jest.advanceTimersByTime(HIGHLIGHT_DURATION_MS)
      expect(ctx.highlightedKey).toBeNull()
    })

    it('clears the highlight for a hash that matches no highlightable key', () => {
      const ctx = makeContext({ hash: '#unknown', keys: ['foo'] })
      ctx.applyHashHighlight()
      expect(ctx.highlightedKey).toBeNull()
      expect(element.scrollIntoView).not.toHaveBeenCalled()
    })

    it('clears the highlight for a bare or empty hash', () => {
      const ctx = makeContext({ hash: '#', keys: ['foo'] })
      ctx.applyHashHighlight()
      expect(ctx.highlightedKey).toBeNull()
      expect(element.scrollIntoView).not.toHaveBeenCalled()
    })

    it('does not throw when the target element is not in the DOM yet', () => {
      document.getElementById.mockReturnValue(null)
      const ctx = makeContext({ hash: '#foo', keys: ['foo'] })
      expect(() => ctx.applyHashHighlight()).not.toThrow()
      expect(ctx.highlightedKey).toBe('foo')
    })

    it('resets the fade timer when re-applied before it elapses', () => {
      const ctx = makeContext({ hash: '#foo', keys: ['foo', 'bar'] })
      ctx.applyHashHighlight()
      jest.advanceTimersByTime(HIGHLIGHT_DURATION_MS - 1)
      // Re-apply for another key: the previous fade timer must be cancelled, so the
      // highlight does not vanish 1ms later.
      ctx.$route.hash = '#bar'
      ctx.applyHashHighlight()
      jest.advanceTimersByTime(1)
      expect(ctx.highlightedKey).toBe('bar')
      jest.advanceTimersByTime(HIGHLIGHT_DURATION_MS)
      expect(ctx.highlightedKey).toBeNull()
    })
  })

  it('applies the highlight on mount', () => {
    const ctx = makeContext({ hash: '#foo', keys: ['foo'] })
    deepLinkHighlight.mounted.call(ctx)
    expect(ctx.highlightedKey).toBe('foo')
  })

  it('re-applies the highlight when the route hash changes', () => {
    const ctx = makeContext({ hash: '#foo', keys: ['foo'] })
    deepLinkHighlight.watch['$route.hash'].call(ctx)
    expect(ctx.highlightedKey).toBe('foo')
  })

  it('clears the fade timer on destroy', () => {
    const ctx = makeContext({ hash: '#foo', keys: ['foo'] })
    ctx.applyHashHighlight()
    deepLinkHighlight.beforeDestroy.call(ctx)
    // Timer cancelled → advancing past the duration leaves the key untouched.
    jest.advanceTimersByTime(HIGHLIGHT_DURATION_MS)
    expect(ctx.highlightedKey).toBe('foo')
  })
})
