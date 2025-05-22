import { state, mutations, getters, actions } from './categories'
import CategoryQuery from '~/graphql/CategoryQuery'

describe('categories store', () => {
  describe('initial state', () => {
    it('sets no categories and is not inizialized', () => {
      expect(state()).toEqual({
        categories: [],
        isInizialized: false,
      })
    })
  })

  describe('getters', () => {
    describe('categoriesActive', () => {
      it('returns true if there are categories', () => {
        const state = { categories: ['cat1', 'cat2'] }
        expect(getters.categoriesActive(state)).toBe(true)
      })

      it('returns false if there are no categories', () => {
        const state = { categories: [] }
        expect(getters.categoriesActive(state)).toBe(false)
      })
    })
  })

  describe('mutations', () => {
    let testMutation

    describe('SET_CATEGORIES', () => {
      beforeEach(() => {
        testMutation = (categories) => {
          mutations.SET_CATEGORIES(state, categories)
          return getters.categories(state)
        }
      })

      it('sets categories to [] if value is undefined', () => {
        expect(testMutation(undefined)).toEqual([])
      })

      it('sets categories correctly', () => {
        expect(testMutation(['cat1', 'cat2', 'cat3'])).toEqual(['cat1', 'cat2', 'cat3'])
      })
    })

    describe('SET_INIZIALIZED', () => {
      beforeEach(() => {
        testMutation = () => {
          mutations.SET_INIZIALIZED(state)
          return getters.isInizialized(state)
        }
      })

      it('sets isInizialized to true', () => {
        expect(testMutation()).toBe(true)
      })
    })
  })

  describe('actions', () => {
    const queryMock = jest.fn().mockResolvedValue({
      data: {
        Category: ['cat1', 'cat2', 'cat3'],
      },
    })
    const commit = jest.fn()

    let action

    beforeEach(() => {
      const module = {
        app: {
          apolloProvider: {
            defaultClient: {
              query: queryMock,
            },
          },
        },
      }
      action = actions.init.bind(module)
    })

    describe('init', () => {
      beforeEach(async () => {
        await action({ commit })
      })

      it('calls apollo', () => {
        expect(queryMock).toBeCalledWith({
          query: CategoryQuery(),
        })
      })

      it('commits SET_CATEGORIES', () => {
        expect(commit).toBeCalledWith('SET_CATEGORIES', ['cat1', 'cat2', 'cat3'])
      })

      it('commits SET_INIZIALIZED', () => {
        expect(commit).toBeCalledWith('SET_INIZIALIZED')
      })
    })
  })
})
