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

  // An attribute value may contain `>`. Matching the tag as "anything up to the next
  // `>`" ends it inside the quotes and spills the rest of the attribute into the text.
  // sanitize-html escapes these before they are stored, so this is about not depending
  // on that — the filter is handed content from wherever its caller got it.
  it.each([
    ['double-quoted', '<a title="A > B">FAQ</a>'],
    ['single-quoted', "<a href='https://example.org/?a=1>2'>FAQ</a>"],
    ['in the href', '<a href="https://example.org/?a=1>2">FAQ</a>'],
  ])('unwraps a link with %s attributes containing ">"', (_case, html) => {
    expect(removeLinks(html)).toBe('FAQ')
  })

  it('discards content that is only linebreaks', () => {
    expect(removeLinks('<br><br>')).toBe('')
  })
})
