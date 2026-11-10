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
      /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme='light'\]\):not\(\[data-theme='dark'\]\)\s*\{\s*--bg: #000;?\s*\}\s*\}/,
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
})
