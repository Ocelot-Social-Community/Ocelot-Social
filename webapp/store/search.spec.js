import { state as createState, mutations, getters } from './search.js'

describe('search store', () => {
  it('starts with an empty searchValue', () => {
    expect(createState()).toEqual({ searchValue: '' })
  })

  describe('SET_VALUE mutation', () => {
    it('writes the given value through', () => {
      const state = createState()
      mutations.SET_VALUE(state, { searchValue: 'foo' })
      expect(state.searchValue).toBe('foo')
    })

    it('falls back to an empty string when no value is passed', () => {
      const state = { searchValue: 'old' }
      mutations.SET_VALUE(state, {})
      expect(state.searchValue).toBe('')
    })
  })

  describe('searchValue getter', () => {
    it('returns the current value', () => {
      expect(getters.searchValue({ searchValue: 'hi' })).toBe('hi')
    })
  })
})
