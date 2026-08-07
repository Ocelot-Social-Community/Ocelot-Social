const { stripComments, brandClasses, isRendered } = require('./check-brand-css')

describe('stripComments', () => {
  it('drops template comments', () => {
    expect(stripComments('<!-- <div class="user-teaser"> --><p class="live"></p>')).toBe(
      '<p class="live"></p>',
    )
  })

  it('drops whole-line line comments', () => {
    expect(stripComments('const a = 1\n  // renamed from .user-teaser\nconst b = 2\n')).toBe(
      'const a = 1\n\nconst b = 2\n',
    )
  })

  it('drops block comments that open their own line', () => {
    const src = [
      '.live {',
      '  /**',
      '   * was .profile-avatar',
      '   */',
      '  color: red;',
      '}',
    ].join('\n')
    expect(stripComments(src)).not.toContain('profile-avatar')
    expect(stripComments(src)).toContain('color: red;')
  })

  it('keeps a URL and everything after it — `//` mid-line does not start a comment', () => {
    const src = '<a href="https://example.org" class="social-link">x</a>'
    expect(stripComments(src)).toBe(src)
  })

  it('keeps code following a path glob, whose slash-star must not open a comment', () => {
    const src = "collectCoverageFrom: ['**/*.vue']\nconst cls = 'still-here'\n"
    expect(stripComments(src)).toContain('still-here')
  })
})

describe('brandClasses', () => {
  it('collects every class a selector targets', () => {
    const css = '.hero .title, .hero > .subtitle { color: red }\n.hero:hover { color: blue }'
    expect([...brandClasses(css)]).toEqual(['hero', 'title', 'subtitle'])
  })

  it('ignores classes named only in a comment', () => {
    expect([...brandClasses('/* .user-teaser was here */\n.user-avatar { color: red }')]).toEqual([
      'user-avatar',
    ])
  })
})

describe('isRendered', () => {
  it('accepts a class the webapp renders', () => {
    expect(isRendered('user-avatar', '<div class="user-avatar">')).toBe(true)
  })

  it("rejects a class that survives only in a comment — the check's original blind spot", () => {
    const source = stripComments(
      '// the old .user-teaser markup lived here\n<div class="user-avatar">',
    )
    expect(isRendered('user-teaser', source)).toBe(false)
    expect(isRendered('user-avatar', source)).toBe(true)
  })

  it('is not satisfied by a longer class sharing the prefix', () => {
    expect(isRendered('user-avatar', '<div class="user-avatar-popover">')).toBe(false)
  })

  it('trusts prefixes the app composes at runtime', () => {
    expect(isRendered('page-name-login', '')).toBe(true)
  })

  it('trusts vendor prefixes rendered by a library', () => {
    expect(isRendered('iziToast-wrapper', '')).toBe(true)
  })
})
