import { findUnfinished } from './unfinishedSuggestions'

describe('findUnfinished', () => {
  const both = ['mention', 'hashtag']
  const found = (text, types = both) =>
    findUnfinished(text, types).map(({ from, to }) => text.slice(from, to))

  it('finds a typed mention and a typed hashtag', () => {
    expect(found('Hello @pet and #hall!')).toEqual(['@pet', '#hall'])
  })

  it('finds them at the start of the text and after an opening bracket or quote', () => {
    expect(found('@pet (@jim) „#hall“')).toEqual(['@pet', '@jim', '#hall'])
  })

  it('leaves the "@" of an email address alone', () => {
    expect(found('write to name@domain.de')).toEqual([])
  })

  it('leaves the "#" of a link fragment alone', () => {
    expect(found('see https://example.org/page#top')).toEqual([])
  })

  it('does not count a lone "@" or "#", which is the start of a list', () => {
    expect(found('Hello @ and # alone')).toEqual([])
  })

  it('takes a dash, dot and underscore inside a mention but not a closing dot', () => {
    expect(found('@peter-lustig_1.x. next')).toEqual(['@peter-lustig_1.x'])
  })

  it('says which kind each one is', () => {
    expect(findUnfinished('@pet #hall', both).map(({ type }) => type)).toEqual([
      'mention',
      'hashtag',
    ])
  })

  it('only looks for the kinds the editor offers', () => {
    expect(found('@pet #hall', ['mention'])).toEqual(['@pet'])
    expect(found('@pet #hall', ['hashtag'])).toEqual(['#hall'])
  })
})
