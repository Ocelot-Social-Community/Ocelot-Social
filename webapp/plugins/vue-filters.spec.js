import Filters from '~/plugins/vue-filters'

const { removeLinks } = Filters({ app: {} }).$filters

describe('removeLinks', () => {
  it('returns an empty string for missing content', () => {
    expect(removeLinks(undefined)).toBe('')
    expect(removeLinks('')).toBe('')
  })

  it('unwraps a single link but keeps its text', () => {
    expect(removeLinks('<p>Read the <a href="https://ocelot.social">handbook</a>.</p>')).toBe(
      '<p>Read the handbook.</p>',
    )
  })

  it('keeps the text between two links', () => {
    expect(
      removeLinks(
        '<p>Read the <a href="https://ocelot.social">handbook</a> and the <a href="https://example.org">FAQ</a>.</p>',
      ),
    ).toBe('<p>Read the handbook and the FAQ.</p>')
  })

  it('unwraps an empty link', () => {
    expect(removeLinks('<p>a<a href="https://example.org"></a>b</p>')).toBe('<p>ab</p>')
  })

  it('unwraps links spanning several lines', () => {
    expect(removeLinks('<a\n  href="https://example.org"\n>FAQ</a>')).toBe('FAQ')
  })

  it('discards content that is only linebreaks', () => {
    expect(removeLinks('<br><br>')).toBe('')
  })
})
