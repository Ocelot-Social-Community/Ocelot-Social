import SelectUserSearch from './SelectUserSearch.vue'

const { methods, computed, data } = SelectUserSearch

const freshData = () => data()

describe('SelectUserSearch', () => {
  describe('data defaults', () => {
    it('starts with empty users, query and user object', () => {
      expect(freshData()).toEqual({ users: [], query: '', user: {} })
    })
  })

  describe('startSearch computed', () => {
    it('is false for empty or short queries', () => {
      expect(computed.startSearch.call({ query: '' })).toBeFalsy()
      expect(computed.startSearch.call({ query: 'ab' })).toBe(false)
    })

    it('becomes true at 3 characters', () => {
      expect(computed.startSearch.call({ query: 'abc' })).toBe(true)
      expect(computed.startSearch.call({ query: 'longer query' })).toBe(true)
    })

    it('handles a missing query gracefully', () => {
      expect(computed.startSearch.call({ query: undefined })).toBeFalsy()
    })
  })

  describe('handleInput', () => {
    it('writes a trimmed value into query', () => {
      const ctx = freshData()
      methods.handleInput.call(ctx, { target: { value: '  hello  ' } })
      expect(ctx.query).toBe('hello')
    })

    it('falls back to empty string when no target is present', () => {
      const ctx = { query: 'old' }
      methods.handleInput.call(ctx, {})
      expect(ctx.query).toBe('')
    })
  })

  describe('onBlur', () => {
    it('clears the query (auto-reset on blur)', () => {
      const ctx = { query: 'something' }
      methods.onBlur.call(ctx)
      expect(ctx.query).toBe('')
    })
  })

  describe('onFocus / onEnter', () => {
    it('onFocus is a no-op', () => {
      expect(() => methods.onFocus.call({})).not.toThrow()
    })

    it('onEnter is a no-op', () => {
      expect(() => methods.onEnter.call({})).not.toThrow()
    })
  })

  describe('clear', () => {
    it('resets query, user and users', () => {
      const ctx = { query: 'foo', user: { id: 'u1' }, users: [{ id: 'u1' }] }
      methods.clear.call(ctx)
      expect(ctx).toEqual({ query: '', user: {}, users: [] })
    })
  })

  describe('onDelete', () => {
    it('clears the whole component when the field becomes empty', () => {
      const ctx = {
        query: 'a',
        user: { id: 'u1' },
        users: [{ id: 'u1' }],
        handleInput: methods.handleInput,
        clear: methods.clear,
      }
      methods.onDelete.call(ctx, { target: { value: '' } })
      expect(ctx).toMatchObject({ query: '', user: {}, users: [] })
    })

    it('updates the query when a value remains', () => {
      const ctx = {
        query: 'abc',
        user: { id: 'u1' },
        users: [{ id: 'u1' }],
        handleInput: methods.handleInput,
        clear: methods.clear,
      }
      methods.onDelete.call(ctx, { target: { value: 'ab' } })
      expect(ctx.query).toBe('ab')
      // existing selection is preserved when the user is still typing
      expect(ctx.user).toEqual({ id: 'u1' })
    })

    it('treats whitespace-only input as empty and clears', () => {
      const ctx = {
        query: 'foo',
        user: { id: 'u1' },
        users: [{ id: 'u1' }],
        handleInput: methods.handleInput,
        clear: methods.clear,
      }
      methods.onDelete.call(ctx, { target: { value: '   ' } })
      expect(ctx.query).toBe('')
    })
  })

  describe('onSelect', () => {
    it('stores the selected item and emits select-user', () => {
      const $emit = jest.fn()
      const ctx = { user: {}, $emit }
      methods.onSelect.call(ctx, { id: 'u9', name: 'Alice' })
      expect(ctx.user).toEqual({ id: 'u9', name: 'Alice' })
      expect($emit).toHaveBeenCalledWith('select-user', { id: 'u9', name: 'Alice' })
    })
  })

  describe('apollo searchUsers', () => {
    const apollo = SelectUserSearch.apollo.searchUsers

    it('builds variables from the current query', () => {
      const variables = apollo.variables.call({ query: 'al' })
      expect(variables).toEqual({ query: 'al', firstUsers: 5, usersOffset: 0 })
    })

    it('skips the query unless startSearch is truthy', () => {
      expect(apollo.skip.call({ startSearch: false })).toBe(true)
      expect(apollo.skip.call({ startSearch: true })).toBe(false)
    })

    it('writes the searched users into the local list on update', () => {
      const ctx = { users: [] }
      apollo.update.call(ctx, { searchUsers: { users: [{ id: 'u1' }, { id: 'u2' }] } })
      expect(ctx.users).toEqual([{ id: 'u1' }, { id: 'u2' }])
    })

    it('returns the searchUsers gql document via query()', () => {
      expect(apollo.query.call({})).toBeDefined()
    })
  })
})
