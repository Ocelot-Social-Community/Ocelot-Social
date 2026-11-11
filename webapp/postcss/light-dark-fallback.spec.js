const postcss = require('postcss')
const plugin = require('./light-dark-fallback')

const run = async (css) => (await postcss([plugin()]).process(css, { from: undefined })).css

describe('the plugin', () => {
  const SUPPORTS = '@supports not (color: light-dark(red, blue))'

  it('adds the light halves under @supports not, after the :root rule', async () => {
    const out = await run(':root { --bg: light-dark(#fff, #000); --size: 4px; }')
    expect(out).toContain(SUPPORTS)
    expect(out).toMatch(/@supports[^{]*\{\s*:root\s*\{\s*--bg: #fff;?\s*\}/)
    expect(out).not.toMatch(/--size[^}]*\}\s*\}\s*$/)
    expect(out.indexOf(':root { --bg')).toBeLessThan(out.indexOf('@supports'))
  })

  it("adds the dark halves for data-theme='dark'", async () => {
    const out = await run(':root { --bg: light-dark(#fff, #000); }')
    expect(out).toMatch(/:root\[data-theme='dark'\]\s*\{\s*--bg: #000;?\s*\}/)
  })

  it('adds the dark halves for "system" when the device prefers dark', async () => {
    const out = await run(':root { --bg: light-dark(#fff, #000); }')
    expect(out).toMatch(
      /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\[data-theme='system'\],\s*:root:not\(\[data-theme\]\)\s*\{\s*--bg: #000;?\s*\}\s*\}/,
    )
  })

  it('keeps all three blocks inside the one @supports rule, light first', async () => {
    const out = await run(':root { --bg: light-dark(#fff, #000); }')
    const at = out.indexOf(SUPPORTS)
    expect(at).toBeGreaterThan(-1)
    const inside = out.slice(at)
    expect(inside.indexOf(':root {')).toBeLessThan(inside.indexOf("[data-theme='dark']"))
    expect(inside.indexOf("[data-theme='dark']")).toBeLessThan(inside.indexOf('@media'))
    expect(out.match(/@supports/g)).toHaveLength(1)
  })

  it('takes both halves of a value with several pairs, and what lies between', async () => {
    const out = await run(
      ':root { --s: 0 0 2px light-dark(transparent, black), 0 0 4px light-dark(red, blue); }',
    )
    expect(out).toContain('--s: 0 0 2px transparent, 0 0 4px red')
    expect(out).toContain('--s: 0 0 2px black, 0 0 4px blue')
  })

  it('leaves the source declaration as it was', async () => {
    expect(await run(':root { --bg: light-dark(#fff, #000); }')).toContain(
      '--bg: light-dark(#fff, #000)',
    )
  })

  it('adds nothing without a pair', async () => {
    const css = ':root { --size: 4px; }'
    expect(await run(css)).toBe(css)
  })

  it('reads only a top-level :root, not a media block or another selector', async () => {
    const css =
      '.a { --x: light-dark(red, blue); } @media print { :root { --y: light-dark(red, blue); } }'
    expect(await run(css)).toBe(css)
  })

  it('takes the last declaration of a property', async () => {
    const out = await run(':root { --c: light-dark(red, blue); --c: light-dark(green, navy); }')
    expect(out).toContain('--c: green')
    expect(out).toContain('--c: navy')
    expect(out).not.toMatch(/@supports[\s\S]*--c: red/)
    expect(out).not.toMatch(/@supports[\s\S]*--c: blue/)
  })

  describe('a pair that mixes', () => {
    const MIX = '@supports not (color: color-mix(in srgb, red, blue))'
    const css =
      ':root { --fill: light-dark(var(--p), color-mix(in srgb, var(--p), black 25%)); --bg: light-dark(#fff, #000); }'

    it('adds a block without color-mix inside the @supports rule, for the mixing token only', async () => {
      const out = await run(css)
      const inner = out.slice(out.indexOf(MIX))
      expect(out).toContain(MIX)
      expect(inner).toMatch(/:root\[data-theme='dark'\]\s*\{\s*--fill: var\(--p\);?\s*\}/)
      expect(inner).not.toContain('--bg')
      expect(inner).not.toContain('color-mix(in srgb, var(--p), black')
    })

    it('puts it after the dark blocks, in all three places', async () => {
      const out = await run(css)
      expect(out.indexOf(MIX)).toBeGreaterThan(out.indexOf("[data-theme='system']"))
      expect(out.slice(out.indexOf(MIX)).match(/--fill: var\(--p\)/g)).toHaveLength(3)
    })

    it('adds nothing for a pair without color-mix', async () => {
      expect(await run(':root { --bg: light-dark(#fff, #000); }')).not.toContain('color-mix')
    })

    it('takes the first colour out of a nested mix, whatever its own parentheses hold', async () => {
      const out = await run(
        ':root { --a: light-dark(red, color-mix(in srgb, color-mix(in srgb, rgb(1, 2, 3), white 10%), black 25%)); }',
      )
      expect(out.slice(out.indexOf(MIX))).toContain('--a: rgb(1, 2, 3)')
    })

    it('keeps a mix of one colour as that colour', async () => {
      const out = await run(':root { --a: light-dark(red, color-mix(in srgb, blue)); }')
      expect(out.slice(out.indexOf(MIX))).toContain('--a: blue')
    })
  })

  describe('a token that mixes and is no pair', () => {
    const MIX = '@supports not (color: color-mix(in srgb, red, blue))'

    it('gets its own :root block without the mix, whatever else the file holds', async () => {
      const out = await run(
        ':root { --active: color-mix(in srgb, var(--p), black 20%); --size: 4px; }',
      )
      expect(out).toMatch(
        /@supports not \(color: color-mix\(in srgb, red, blue\)\)\s*\{\s*:root\s*\{\s*--active: var\(--p\);?\s*\}\s*\}/,
      )
      expect(out).not.toContain('light-dark')
      expect(out.slice(out.indexOf(MIX))).not.toContain('--size')
    })

    it('drops the percentage of the colour it keeps, before or after it', async () => {
      const out = await run(
        ':root { --a: color-mix(in srgb, red 30%, blue); --b: color-mix(in srgb, 30% red, blue); }',
      )
      expect(out).toContain('--a: red')
      expect(out).toContain('--b: red')
    })

    it('turns a tint into transparent, not into the full colour', async () => {
      const out = await run(
        ':root { --a: color-mix(in srgb, var(--c) 14%, transparent); --b: color-mix(in srgb, transparent, var(--c) 14%); }',
      )
      expect(out.slice(out.indexOf(MIX))).toContain('--a: transparent')
      expect(out.slice(out.indexOf(MIX))).toContain('--b: transparent')
    })

    it('comes once, next to the pairs block when there is one', async () => {
      const out = await run(
        ':root { --a: color-mix(in srgb, red, black 10%); --b: light-dark(#fff, #000); }',
      )
      expect(out.match(/@supports not \(color: light-dark/g)).toHaveLength(1)
      expect(out.slice(out.indexOf(MIX))).toContain('--a: red')
    })
  })
})
