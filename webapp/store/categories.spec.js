import { state, mutations, getters, actions } from './categories'
import CategoryQuery from '~/graphql/CategoryQuery'

describe('categories store', () => {
  describe('initial state', () => {
    it('sets no categories', () => {
      expect(state()).toEqual({
        categories: [],
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
      describe('categories NOT active', () => {
        beforeEach(async () => {
          jest.clearAllMocks()
          process.env.CATEGORIES_ACTIVE = false
          await action({ commit })
        })

        it('does not call apollo', () => {
          expect(queryMock).not.toBeCalled()
        })
      })

      describe('categories active', () => {
        beforeEach(async () => {
          process.env.CATEGORIES_ACTIVE = true
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
      })
    })
  })
})
