const postcss = require('postcss')
const plugin = require('./light-dark-fallback')

const run = async (css) => (await postcss([plugin()]).process(css, { from: undefined })).css

describe('the plugin', () => {
  it('adds the light halves under @supports not, after the :root rule', async () => {
    const out = await run(':root { --bg: light-dark(#fff, #000); --size: 4px; }')
    expect(out).toContain('@supports not (color: light-dark(red, blue))')
    expect(out).toMatch(/@supports[^{]*\{\s*:root\s*\{\s*--bg: #fff;?\s*\}\s*\}/)
    expect(out).not.toMatch(/--size[^}]*\}\s*\}\s*$/)
    expect(out.indexOf(':root { --bg')).toBeLessThan(out.indexOf('@supports'))
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
    const out = await run(':root { --c: light-dark(red, blue); --c: light-dark(green, blue); }')
    expect(out).toContain('--c: green')
    expect(out).not.toMatch(/@supports[\s\S]*--c: red/)
  })
})
