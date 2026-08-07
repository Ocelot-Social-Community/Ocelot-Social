const {
  toRgb,
  readTokens,
  indexByRgb,
  declarations,
  styleBodies,
  checkSource,
} = require('./check-css-tokens')

const style = (css, attrs = ' scoped') => `<template><i /></template><style${attrs}>${css}</style>`

describe('toRgb', () => {
  it.each([
    ['#fff', '255,255,255'],
    ['#17b53f', '23,181,63'],
    ['white', '255,255,255'],
    ['BLACK', '0,0,0'],
    ['rgb(245, 196, 0)', '245,196,0'],
    ['rgb(189 189 189)', '189,189,189'],
  ])('reads %s as an opaque colour', (raw, rgb) => {
    expect(toRgb(raw)).toBe(rgb)
  })

  it.each(['rgba(255, 255, 255, 0.3)', '#ffff', '#ffffff80'])(
    'refuses %s — alpha has no opaque token to point at',
    (raw) => {
      expect(toRgb(raw)).toBeNull()
    },
  )

  it('refuses anything that is not a colour', () => {
    expect(toRgb('inherit')).toBeNull()
  })
})

describe('declarations', () => {
  it('reads a value that wraps across lines', () => {
    const decls = declarations('.a {\n  box-shadow:\n    0 1px #fff,\n    0 2px #000;\n}')
    expect(decls).toEqual([{ prop: 'box-shadow', value: '0 1px #fff,\n    0 2px #000' }])
  })

  it('reads the last declaration of a block even without its semicolon', () => {
    expect(declarations('.a {\n  color: red\n}')).toEqual([{ prop: 'color', value: 'red' }])
  })

  it.each([
    ['a pseudo-class selector', '.a:hover {\n  color: red;\n}'],
    ['a media query', '@media (min-width: 768px) {\n  .a {\n    color: red;\n  }\n}'],
  ])('does not mistake %s for a declaration', (_name, css) => {
    expect(declarations(css).map((d) => d.prop)).toEqual(['color'])
  })

  it('ignores commented-out declarations', () => {
    expect(declarations('.a {\n  /* color: #fff; */\n  width: 0;\n}')).toEqual([
      { prop: 'width', value: '0' },
    ])
  })
})

describe('styleBodies', () => {
  it('collects plain CSS blocks', () => {
    expect(styleBodies(style('.a { color: red; }'))).toHaveLength(1)
  })

  it.each([
    ['lang="scss"', ' lang="scss"'],
    ["lang='scss'", " lang='scss'"],
    ['lang=scss', ' lang=scss'],
    ['lang="sass"', ' lang="sass"'],
    ['lang=sass', ' lang=sass'],
    ['lang=scss scoped', ' lang=scss scoped'],
  ])('skips %s blocks — those still have a preprocessor', (_name, attrs) => {
    expect(styleBodies(style('.a { color: $red; }', attrs))).toEqual([])
  })

  it('does not mistake a lang it has never heard of for scss', () => {
    expect(styleBodies(style('.a { color: red; }', ' lang=scssish'))).toHaveLength(1)
  })

  it('returns nothing for a file without a style block', () => {
    expect(styleBodies('<template><i /></template>')).toEqual([])
  })
})

describe('indexByRgb', () => {
  it('keeps the first token holding a colour — the primitive, not its alias', () => {
    expect(
      indexByRgb({ 'color-yellow': 'rgb(245, 196, 0)', 'color-toast': 'rgb(245, 196, 0)' }),
    ).toEqual({ '245,196,0': 'color-yellow' })
  })

  it('skips tokens that are not colours', () => {
    expect(indexByRgb({ 'space-base': '1rem' })).toEqual({})
  })
})

describe('readTokens', () => {
  it('reads the real token files, one value per name', () => {
    const tokens = readTokens()
    expect(Object.keys(tokens).length).toBeGreaterThan(0)
    expect(indexByRgb(tokens)).toHaveProperty('255,255,255')
  })
})

describe('checkSource', () => {
  const byRgb = { '23,181,63': 'color-primary' }

  it('flags a literal that duplicates a token', () => {
    const { errors } = checkSource(style('.a { color: #17b53f; }'), byRgb, 'A.vue')
    expect(errors).toEqual(['A.vue: #17b53f — use var(--color-primary) instead'])
  })

  it('flags a literal hidden in a value that wraps across lines', () => {
    const css = '.a {\n  background: color-mix(\n    in srgb,\n    #17b53f,\n    black 30%\n  );\n}'
    const { errors } = checkSource(style(css), byRgb, 'A.vue')
    expect(errors).toEqual(['A.vue: #17b53f — use var(--color-primary) instead'])
  })

  it('flags a leftover SCSS variable', () => {
    const { errors } = checkSource(style('.a { color: $primary; }'), byRgb, 'A.vue')
    expect(errors).toEqual([
      'A.vue: $primary — SCSS variable in a plain CSS block, resolves to nothing',
    ])
  })

  it('allows a literal where the token itself is declared', () => {
    const { errors } = checkSource(style(':root { --color-primary: #17b53f; }'), byRgb, 'A.vue')
    expect(errors).toEqual([])
  })

  it('counts a colour that has no token instead of erroring — a token is a design decision', () => {
    const { errors, untokenised } = checkSource(style('.a { color: #123456; }'), byRgb, 'A.vue')
    expect(errors).toEqual([])
    expect(untokenised).toBe(1)
  })

  it('does not read the white in white-space as a colour', () => {
    const white = { '255,255,255': 'color-neutral-100' }
    const { errors, untokenised } = checkSource(
      style('.a { white-space: nowrap; }'),
      white,
      'A.vue',
    )
    expect(errors).toEqual([])
    expect(untokenised).toBe(0)
  })

  it('leaves scss blocks alone', () => {
    const { errors } = checkSource(style('.a { color: $primary; }', ' lang="scss"'), byRgb, 'A.vue')
    expect(errors).toEqual([])
  })
})
