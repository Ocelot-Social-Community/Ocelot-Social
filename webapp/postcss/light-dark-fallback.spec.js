const postcss = require('postcss')
const plugin = require('./light-dark-fallback')

const run = async (css) => (await postcss([plugin()]).process(css, { from: undefined })).css

describe('lightHalf', () => {
  const { lightHalf } = plugin

  it('takes the first argument', () => {
    expect(lightHalf('light-dark(#fff, #000)')).toBe('#fff')
  })

  it('keeps nested calls and commas inside them', () => {
    expect(lightHalf('light-dark(var(--a, red), rgb(1, 2, 3))')).toBe('var(--a, red)')
  })

  it('resolves every pair of a value, and keeps what lies between', () => {
    expect(lightHalf('0 0 2px light-dark(transparent, black), 0 0 4px light-dark(red, blue)')).toBe(
      '0 0 2px transparent, 0 0 4px red',
    )
  })

  it('resolves a pair inside the first argument', () => {
    expect(lightHalf('light-dark(light-dark(a, b), c)')).toBe('a')
  })

  it('leaves a value without a pair, and a broken call, alone', () => {
    expect(lightHalf('var(--x)')).toBe('var(--x)')
    expect(lightHalf('light-dark(red)')).toBe('light-dark(red)')
    expect(lightHalf('light-dark(red, blue')).toBe('light-dark(red, blue')
  })
})

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
