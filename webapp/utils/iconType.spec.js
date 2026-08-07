const { iconType } = require('./iconType.js')

describe('iconType', () => {
  it.each([
    ['/a/favicon.ico', 'image/x-icon'],
    ['/a/icon.PNG', 'image/png'],
    ['/a/icon.svg', 'image/svg+xml'],
    ['/a/icon.jpeg', 'image/jpeg'],
    ['/a/icon.webp', 'image/webp'],
  ])('reads %s', (href, type) => {
    expect(iconType(href)).toBe(type)
  })

  it('ignores a cache-busting query', () => {
    expect(iconType('/a/favicon.ico?v=2')).toBe('image/x-icon')
  })

  // A dot in a directory name must not be mistaken for the file's extension.
  it('reads the extension of the FILE, not of a folder on the way there', () => {
    expect(iconType('/branding/social.darmbulanz.net/assets/icon.png')).toBe('image/png')
  })

  // A wrong type can make the browser discard the icon; no type lets it sniff. So an extension we do
  // not know must yield nothing rather than a guess.
  it.each(['/a/favicon.xyz', '/a/favicon', '', null, undefined])(
    'says nothing about %s',
    (href) => {
      expect(iconType(href)).toBeUndefined()
    },
  )
})
