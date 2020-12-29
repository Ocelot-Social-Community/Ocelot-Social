import uniqueSlug from './uniqueSlug'

describe('uniqueSlug', () => {
  it('slugifies given string', () => {
    const string = 'Hello World'
    const isUnique = jest.fn().mockResolvedValue(true)
    expect(uniqueSlug(string, isUnique)).resolves.toEqual('hello-world')
  })

  it('increments slugified string until unique', () => {
    const string = 'Hello World'
    const isUnique = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    expect(uniqueSlug(string, isUnique)).resolves.toEqual('hello-world-1')
  })

  it('slugify null string', () => {
    const string = null
    const isUnique = jest.fn().mockResolvedValue(true)
    expect(uniqueSlug(string, isUnique)).resolves.toEqual('anonymous')
  })
})

describe('Slug is transliterated correctly', () => {
  it('Converts umlaut to a two letter equivalent', () => {
    const umlaut = 'ä';
    const isUnique = jest.fn().mockResolvedValue(true)
    expect(uniqueSlug(umlaut, isUnique)).resolves.toEqual('ae');
  })

  it('Removes Spanish enya ', () => {
    const enya = 'ñ';
    const isUnique = jest.fn().mockResolvedValue(true)
    expect(uniqueSlug(enya, isUnique)).resolves.toEqual('n');
  })
})
