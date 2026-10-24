const {
  toRgb,
  readTokens,
  indexByRgb,
  declarations,
  styleBodies,
  checkSource,
  checkNeutral,
  findProblems,
} = require('./check-css-tokens')
const { mkdtempSync, mkdirSync, writeFileSync } = require('fs')
const { tmpdir } = require('os')
const { join, dirname } = require('path')

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

  it('flags a neutral step read directly by a component', () => {
    const { errors } = checkSource(style('.a { color: var(--color-neutral-50); }'), byRgb, 'A.vue')
    expect(errors).toEqual([
      'A.vue: var(--color-neutral-50) — use a role token (background/text/border) instead',
    ])
  })

  it('flags every direct neutral step in one declaration', () => {
    const { errors } = checkSource(
      style('.a { box-shadow: 0 0 var(--color-neutral-50), 0 0 var(--color-neutral-90); }'),
      byRgb,
      'A.vue',
    )
    expect(errors).toEqual([
      'A.vue: var(--color-neutral-50) — use a role token (background/text/border) instead',
      'A.vue: var(--color-neutral-90) — use a role token (background/text/border) instead',
    ])
  })

  it('flags a neutral step in a JS value too (constants)', () => {
    expect(checkNeutral("toggle: 'var(--color-neutral-30)',", 'constants/chat.js')).toEqual([
      'constants/chat.js: var(--color-neutral-30) — use a role token (background/text/border) instead',
    ])
  })

  it('flags a component-local alias of a neutral step — the same direct read, one hop later', () => {
    const { errors } = checkSource(
      style(':root { --text-color-muted: var(--color-neutral-50); }'),
      byRgb,
      'A.vue',
    )
    expect(errors).toEqual([
      'A.vue: var(--color-neutral-50) — use a role token (background/text/border) instead',
    ])
  })

  it('flags a neutral step in the script of a component, not only in its style', () => {
    const src =
      "<template><i /></template><script>const toggle = 'var(--color-neutral-30)'</script>"
    expect(checkSource(src, byRgb, 'A.vue').errors).toEqual([
      'A.vue: var(--color-neutral-30) — use a role token (background/text/border) instead',
    ])
  })

  describe('data: URIs', () => {
    const uri = (fill) =>
      `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='${fill}' d='M0 0'/%3E%3C/svg%3E")`
    const reason = 'a data: URI is its own document, no theme reaches it'

    it('flags a %23-encoded fill — the AreaMenu chevron', () => {
      const { errors } = checkSource(
        style(`.a { background-image: ${uri('%234b4554')}; }`),
        byRgb,
        'A.vue',
      )
      expect(errors).toEqual([`A.vue: #4b4554 in a data: URI — ${reason}`])
    })

    it.each(['#fff', 'rgb(1, 2, 3)'])('flags a raw %s too', (fill) => {
      const { errors } = checkSource(style(`.a { background: ${uri(fill)}; }`), byRgb, 'A.vue')
      expect(errors).toEqual([`A.vue: ${fill} in a data: URI — ${reason}`])
    })

    it('flags one in a JS string outside url()', () => {
      const src = `const icon = 'data:image/svg+xml,<svg><circle fill="#000"/></svg>'`
      expect(checkSource(src, byRgb, 'utils/icon.js').errors).toEqual([
        `utils/icon.js: #000 in a data: URI — ${reason}`,
      ])
    })

    it('leaves a URI alone whose colours are resolved at runtime or that carries none', () => {
      const src =
        'const a = `data:image/svg+xml,<svg><circle fill="${fill}"/></svg>`\n' +
        `const b = '${uri('').slice(5, -2)}'`
      expect(checkSource(src, byRgb, 'A.js').errors).toEqual([])
    })
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

describe('findProblems', () => {
  const tree = (files) => {
    const root = mkdtempSync(join(tmpdir(), 'css-tokens-'))
    for (const [path, content] of Object.entries({ 'assets/css/root-tokens.css': '', ...files })) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), content)
    }
    return root
  }

  it('reads every .js, not only constants — the chat palette moved, the rule must not care', () => {
    const root = tree({
      'components/Chat/palette.js': "export default { toggle: 'var(--color-neutral-30)' }",
    })
    expect(findProblems(root).errors).toEqual([
      'components/Chat/palette.js: var(--color-neutral-30) — use a role token (background/text/border) instead',
    ])
  })

  it('reads global .css files', () => {
    const root = tree({ 'assets/css/main.css': 'hr { color: var(--color-neutral-80); }' })
    expect(findProblems(root).errors).toHaveLength(1)
  })

  it('lets the token files build roles on the scale, and skips specs', () => {
    const root = tree({
      'assets/css/root-tokens.css': ':root { --text-color-soft: var(--color-neutral-40); }',
      'assets/css/theme-dark.css': ':root { --x: var(--color-neutral-10); }',
      'assets/css/ocelot-ui-variables.css': ':root { --y: var(--color-neutral-70); }',
      'components/A.spec.js': "expect('var(--color-neutral-30)')",
    })
    expect(findProblems(root).errors).toEqual([])
  })
})
