const {
  toRgb,
  readTokens,
  indexByRgb,
  declarations,
  styleBodies,
  checkSource,
  checkNeutral,
  findProblems,
  localZLimit,
  formatZIndexReport,
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

  it('flags a neutral step with a fallback or a space after the bracket', () => {
    expect(checkNeutral('a { color: var(--color-neutral-50, #fff); }', 'A.vue')).toHaveLength(1)
    expect(checkNeutral('a { color: var( --color-neutral-50 ); }', 'A.vue')).toHaveLength(1)
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

    it('reports a colour in a data: URI once, and does not suggest a token for it', () => {
      // `#fff` is the value of a token, so the plain colour check would answer `use var(--…)` as well.
      const white = { '255,255,255': 'background-color-base' }
      const { errors } = checkSource(style(`.a { background: ${uri('#fff')}; }`), white, 'A.vue')
      expect(errors).toEqual([`A.vue: #fff in a data: URI — ${reason}`])
    })

    it('still checks the rest of the value around a data: URI', () => {
      const white = { '255,255,255': 'background-color-base' }
      const { errors } = checkSource(
        style(`.a { background: ${uri('%234b4554')} #fff; }`),
        white,
        'A.vue',
      )
      expect(errors).toContain('A.vue: #fff — use var(--background-color-base) instead')
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

  it('leaves out build output and hidden directories — what they hold depends on a build', () => {
    const bad = "export default { c: 'var(--color-neutral-30)' }"
    const root = tree({
      'storybook-static/main.js': bad,
      'playwright-report/index.js': bad,
      'test-results/a.js': bad,
      '.cache/b.js': bad,
      'components/ok.js': 'export default {}',
    })
    expect(findProblems(root).errors).toEqual([])
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

describe('checkSource — z-index', () => {
  const check = (css, limit) => checkSource(style(css), {}, 'A.vue', limit)

  it('allows a token, also inside a calc()', () => {
    expect(check('.a { z-index: var(--z-index-modal); }').errors).toEqual([])
    expect(check('.a { z-index: calc(var(--z-index-modal) - 2); }').errors).toEqual([])
  })

  it('allows a local number below the limit, negative ones too', () => {
    expect(check('.a { z-index: 3; }').errors).toEqual([])
    expect(check('.a { z-index: -1; }').errors).toEqual([])
    expect(check('.a { z-index: 99; }', 100).errors).toEqual([])
  })

  it('flags a raw number from the limit up', () => {
    expect(check('.a { z-index: 100; }', 100).errors).toEqual([
      'A.vue: z-index: 100 — use a var(--z-index-*) token; only plain numbers below 100 are local',
    ])
    expect(check('.a { z-index: 9999 !important; }').errors).toHaveLength(1)
  })

  it('flags a raw number that hides in a calc() or another unit', () => {
    expect(check('.a { z-index: calc(150 + 1); }').errors).toHaveLength(1)
    expect(check('.a { z-index: 150px; }').errors).toHaveLength(1)
  })

  it('allows a local number with !important', () => {
    expect(check('.a { z-index: 3 !important; }').errors).toEqual([])
  })

  it('allows a negative number at any depth — it sits below everything, so it is local', () => {
    expect(check('.a { z-index: -100; }', 100).errors).toEqual([])
    expect(check('.a { z-index: -5000; }', 100).errors).toEqual([])
  })

  it('flags a token that is not declared, when it knows the declared ones', () => {
    const known = new Set(['z-index-modal'])
    const run = (css) => checkSource(style(css), {}, 'A.vue', 100, known).errors
    expect(run('.a { z-index: var(--z-index-modal); }')).toEqual([])
    expect(run('.a { z-index: var(--z-index-typo); }')).toEqual([
      'A.vue: z-index: var(--z-index-typo) — --z-index-typo is not a declared token',
    ])
  })

  it('flags a number from the limit up beside a token, but allows a small offset', () => {
    expect(check('.a { z-index: calc(var(--z-index-sticky) + 5000); }', 100).errors).toHaveLength(1)
    expect(check('.a { z-index: calc(var(--z-index-modal) - 2); }', 100).errors).toEqual([])
    expect(check('.a { z-index: calc(var(--z-index-overlay) + 1); }', 100).errors).toEqual([])
  })

  it('rejects a fallback or another variable beside a token', () => {
    expect(check('.a { z-index: var(--z-index-sticky, 9999); }', 100).errors).toHaveLength(1)
    expect(check('.a { z-index: var(--z-index-sticky, -5000); }', 100).errors).toHaveLength(1)
    expect(
      check('.a { z-index: calc(var(--z-index-sticky) + var(--foo)); }', 100).errors,
    ).toHaveLength(1)
  })

  it('allows only one token with at most one small offset', () => {
    const sum = 'calc(var(--z-index-sticky) + var(--z-index-sticky))'
    expect(check(`.a { z-index: ${sum}; }`, 100).errors).toHaveLength(1)
    expect(check('.a { z-index: calc(var(--z-index-sticky) * 50); }', 100).errors).toHaveLength(1)
    expect(check('.a { z-index: calc(var(--z-index-sticky) + 2px); }', 100).errors).toHaveLength(1)
    expect(check('.a { z-index: calc(var(--z-index-sticky) - 2); }', 100).errors).toEqual([])
  })

  it('needs spaces around the operator in calc()', () => {
    expect(check('.a { z-index: calc(var(--z-index-sticky)+2); }', 100).errors).toHaveLength(1)
    expect(check('.a { z-index: calc(var(--z-index-sticky) +2); }', 100).errors).toHaveLength(1)
    expect(check('.a { z-index: calc(var(--z-index-sticky) + 2); }', 100).errors).toEqual([])
  })

  it('checks the property name case-insensitively', () => {
    expect(check('.a { Z-INDEX: 9999; }', 100).errors).toHaveLength(1)
    expect(check('.a { Z-Index: 3; }', 100).errors).toEqual([])
  })

  it('reports an SCSS variable beside a token', () => {
    const { errors } = check('.a { z-index: calc(var(--z-index-sticky) + $offset); }', 100)
    expect(errors).toContain(
      'A.vue: $offset — SCSS variable in a plain CSS block, resolves to nothing',
    )
  })

  it('allows the keywords', () => {
    expect(check('.a { z-index: auto; }').errors).toEqual([])
  })

  it('leaves scss blocks alone', () => {
    const src = style('.a { z-index: 5000; }', ' lang="scss"')
    expect(checkSource(src, {}, 'A.vue').errors).toEqual([])
  })

  it('records the tokens and the local numbers a file uses', () => {
    const { zUsages } = check('.a { z-index: var(--z-index-modal); } .b { z-index: 2; }')
    expect(zUsages).toEqual([
      { rel: 'A.vue', token: 'z-index-modal' },
      { rel: 'A.vue', local: 2 },
    ])
  })
})

describe('localZLimit', () => {
  it('is the lowest page-level token, --z-index-sticky', () => {
    expect(localZLimit({ 'z-index-sticky': '100' })).toBe(100)
  })

  it('falls back when the token is missing or not a number', () => {
    expect(localZLimit({})).toBe(100)
    expect(localZLimit({ 'z-index-sticky': 'calc(1 + 1)' })).toBe(100)
  })

  it('matches the real scale', () => {
    expect(localZLimit(readTokens())).toBe(100)
  })
})

describe('formatZIndexReport', () => {
  const tokens = {
    'z-index-modal': '9999',
    'z-index-page-submenu': '2500',
    'z-index-call-maximized': 'calc(var(--z-index-page-submenu) - 1)',
    'z-index-surface': '1',
    'color-primary': '#17b53f',
  }
  const usages = [
    { rel: 'b/Modal.vue', token: 'z-index-modal' },
    { rel: 'a/Call.vue', token: 'z-index-call-maximized' },
    { rel: 'a/Tile.vue', local: 3 },
    { rel: 'a/Call.vue', local: 3 },
  ]
  const report = formatZIndexReport(tokens, usages)

  it('sorts a token with the value 0 below the others', () => {
    const zero = formatZIndexReport({ ...tokens, 'z-index-zero': '0' }, usages)
    expect(zero.indexOf('--z-index-zero')).toBeGreaterThan(zero.indexOf('--z-index-surface'))
  })

  it('lists the tokens highest first, resolving a calc() level by its number', () => {
    const order = ['--z-index-modal', '--z-index-page-submenu', '--z-index-call-maximized']
    const at = order.map((name) => report.indexOf(name))
    expect(at).toEqual([...at].sort((x, y) => x - y))
    expect(report.indexOf('--z-index-call-maximized')).toBeLessThan(
      report.indexOf('--z-index-surface'),
    )
  })

  it('names the files of a token and marks an unused one', () => {
    expect(report).toContain('b/Modal.vue')
    expect(report).toMatch(/--z-index-page-submenu\n\s+\(unused\)/)
  })

  it('groups the local numbers with their files, sorted', () => {
    expect(report).toMatch(/\n {2}3\n {6}a\/Call\.vue\n {6}a\/Tile\.vue/)
  })

  it('leaves out tokens that are not z-index levels', () => {
    expect(report).not.toContain('color-primary')
  })
})
