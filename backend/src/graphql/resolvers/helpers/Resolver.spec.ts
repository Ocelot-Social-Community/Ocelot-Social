import { removeUndefinedNullValuesFromObject, convertObjectToCypherMapLiteral } from './Resolver'

describe('removeUndefinedNullValuesFromObject', () => {
  it('removes undefined values', () => {
    const obj = { a: 1, b: undefined, c: 'hello' }
    removeUndefinedNullValuesFromObject(obj)
    expect(obj).toEqual({ a: 1, c: 'hello' })
  })

  it('removes null values', () => {
    const obj = { a: 1, b: null, c: 'hello' }
    removeUndefinedNullValuesFromObject(obj)
    expect(obj).toEqual({ a: 1, c: 'hello' })
  })

  it('keeps falsy but defined values', () => {
    const obj = { a: 0, b: false, c: '' }
    removeUndefinedNullValuesFromObject(obj)
    expect(obj).toEqual({ a: 0, b: false, c: '' })
  })

  it('handles empty object', () => {
    const obj = {}
    removeUndefinedNullValuesFromObject(obj)
    expect(obj).toEqual({})
  })
})

describe('convertObjectToCypherMapLiteral', () => {
  it('converts single entry', () => {
    expect(convertObjectToCypherMapLiteral({ id: 'g0' })).toBe('{id: "g0"}')
  })

  it('converts multiple entries', () => {
    expect(convertObjectToCypherMapLiteral({ id: 'g0', slug: 'yoga' })).toBe(
      '{id: "g0", slug: "yoga"}',
    )
  })

  it('returns empty string for empty object', () => {
    expect(convertObjectToCypherMapLiteral({})).toBe('')
  })

  it('adds space in front when addSpaceInfrontIfMapIsNotEmpty is true and map is not empty', () => {
    expect(convertObjectToCypherMapLiteral({ id: 'g0' }, true)).toBe(' {id: "g0"}')
  })

  it('does not add space when addSpaceInfrontIfMapIsNotEmpty is true but map is empty', () => {
    expect(convertObjectToCypherMapLiteral({}, true)).toBe('')
  })

  it('does not add space when addSpaceInfrontIfMapIsNotEmpty is false', () => {
    expect(convertObjectToCypherMapLiteral({ id: 'g0' }, false)).toBe('{id: "g0"}')
  })
})
