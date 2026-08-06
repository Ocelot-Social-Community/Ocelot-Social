import {
  discoverThemeTokens,
  effectiveThemeValue,
  groupThemeTokens,
  summarizeStylesheet,
} from './themeTokens.js'

/**
 * Runs `fn` with no global `document`, which is the only way to reach the SSR branch of these helpers:
 * jest-environment-jsdom always provides one, so passing `null` merely falls through to the real
 * `document` and the assertion then holds for the wrong reason — an empty `styleSheets` list, or
 * whatever `getComputedStyle` returns for an unknown property. Verified by deleting the
 * `typeof document === 'undefined'` guard from the source: both "no document" tests stayed green.
 *
 * The guards use `typeof document`, not a bare reference, precisely so this stays a ReferenceError-free
 * check once the global is gone.
 */
function withoutDocument(fn) {
  const descriptor = Object.getOwnPropertyDescriptor(global, 'document')
  delete global.document
  try {
    fn()
  } finally {
    Object.defineProperty(global, 'document', descriptor)
  }
}

// Minimal CSSOM stand-ins: a rule exposes `selectorText`, and `style` is both iterable over its
// property names and answers getPropertyValue — the two things the collector touches.
const styleOf = (decls) => {
  const props = Object.keys(decls)
  return {
    ...props,
    length: props.length,
    [Symbol.iterator]: function* () {
      yield* props
    },
    getPropertyValue: (p) => decls[p] || '',
  }
}
const rule = (selectorText, decls) => ({ selectorText, style: styleOf(decls) })
const group = (cssRules) => ({ cssRules })
const doc = (sheets) => ({ styleSheets: sheets })

describe('discoverThemeTokens', () => {
  it('collects custom properties from :root rules, without the -- prefix', () => {
    const d = doc([
      { cssRules: [rule(':root', { '--color-primary': 'rgb(1, 2, 3)', '--space-base': '24px' })] },
    ])
    expect(discoverThemeTokens(d)).toEqual({
      'color-primary': 'rgb(1, 2, 3)',
      'space-base': '24px',
    })
  })

  it('ignores non-custom properties and empty values', () => {
    const d = doc([{ cssRules: [rule(':root', { color: 'red', '--empty': '  ', '--ok': '1px' })] }])
    expect(discoverThemeTokens(d)).toEqual({ ok: '1px' })
  })

  it('skips component-scoped properties — only the document root is brandable', () => {
    const d = doc([
      { cssRules: [rule('.card', { '--private': '2px' }), rule(':root', { '--public': '3px' })] },
    ])
    expect(discoverThemeTokens(d)).toEqual({ public: '3px' })
  })

  // The distinction the admin depends on: the framework declares :root, a brand :root:root.
  it('ignores a brand override on :root:root so the framework default survives', () => {
    const d = doc([
      { cssRules: [rule(':root', { '--color-primary': 'framework' })] },
      { cssRules: [rule(':root:root', { '--color-primary': 'brand' })] },
    ])
    expect(discoverThemeTokens(d)).toEqual({ 'color-primary': 'framework' })
  })

  it('takes the last :root declaration, matching the cascade', () => {
    const d = doc([
      { cssRules: [rule(':root', { '--a': 'first' })] },
      { cssRules: [rule(':root', { '--a': 'second' })] },
    ])
    expect(discoverThemeTokens(d)).toEqual({ a: 'second' })
  })

  it('recurses into @media / @supports groups', () => {
    const d = doc([{ cssRules: [group([rule(':root', { '--nested': '1px' })])] }])
    expect(discoverThemeTokens(d)).toEqual({ nested: '1px' })
  })

  it('skips stylesheets that refuse access instead of throwing', () => {
    const hostile = {
      get cssRules() {
        throw new Error('SecurityError')
      },
    }
    const d = doc([hostile, { cssRules: [rule(':root', { '--survived': 'yes' })] }])
    expect(discoverThemeTokens(d)).toEqual({ survived: 'yes' })
  })

  it('returns an empty map when there is no document (SSR)', () => {
    withoutDocument(() => {
      expect(discoverThemeTokens(null)).toEqual({})
    })
  })

  it('tolerates a document without styleSheets', () => {
    expect(discoverThemeTokens(doc(null))).toEqual({})
  })
})

describe('effectiveThemeValue', () => {
  // Restored rather than left behind: a leaked stub answers '' for every unknown property, which is
  // exactly the value the SSR test below asserts — it would then pass with or without the guard.
  const realGetComputedStyle = global.getComputedStyle
  afterEach(() => {
    global.getComputedStyle = realGetComputedStyle
  })

  it('reads the resolved value from the element', () => {
    const el = {}
    global.getComputedStyle = jest.fn(() => ({
      getPropertyValue: (p) => (p === '--color-primary' ? ' red ' : ''),
    }))
    expect(effectiveThemeValue('color-primary', el)).toBe('red')
    expect(global.getComputedStyle).toHaveBeenCalledWith(el)
  })

  it('is safe without a document', () => {
    withoutDocument(() => {
      expect(effectiveThemeValue('x', null)).toBe('')
    })
  })

  it('is safe where getComputedStyle does not exist', () => {
    global.getComputedStyle = undefined
    expect(effectiveThemeValue('x', {})).toBe('')
  })
})

describe('groupThemeTokens', () => {
  it('groups by leading segment and sorts within a group', () => {
    expect(groupThemeTokens(['color-b', 'color-a', 'space-base', 'chat-x'])).toEqual({
      color: ['color-a', 'color-b'],
      space: ['space-base'],
      chat: ['chat-x'],
    })
  })

  it('keeps the two-word z-index family together', () => {
    expect(groupThemeTokens(['z-index-modal', 'z-index-overlay'])).toEqual({
      'z-index': ['z-index-modal', 'z-index-overlay'],
    })
  })
})

describe('summarizeStylesheet', () => {
  it('collects the :root theme properties a brand declares', () => {
    const css = `
      :root { --color-primary: red; --space-base: 8px }
      .footer a { color: white }
    `
    expect(summarizeStylesheet(css)).toEqual({
      customProperties: { 'color-primary': 'red', 'space-base': '8px' },
    })
  })

  it('treats a brand override on :root:root as theme too', () => {
    expect(summarizeStylesheet(':root:root { --a: 1 }')).toEqual({ customProperties: { a: '1' } })
  })

  it('ignores component-scoped properties and comments', () => {
    const css = '/* :root { --commented: 1 } */ .card { --private: 2px }'
    expect(summarizeStylesheet(css)).toEqual({ customProperties: {} })
  })

  it('is safe on empty or missing input', () => {
    expect(summarizeStylesheet('')).toEqual({ customProperties: {} })
    expect(summarizeStylesheet(null)).toEqual({ customProperties: {} })
  })
})
