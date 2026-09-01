import { state as initialState, mutations, getters, actions } from './pinnedPosts'
import { postsPinnedCountsQuery } from '~/graphql/PostQuery'

describe('pinned post store', () => {
  describe('initial state', () => {
    it('starts with no pinned posts and not loaded', () => {
      expect(initialState()).toEqual({
        currentlyPinnedPosts: 0,
        loaded: false,
      })
    })
  })

  describe('mutations', () => {
    let testMutation
    const state = {
      currentlyPinnedPosts: 0,
      loaded: false,
    }

    describe('pinPost', () => {
      it('increments currentlyPinnedPosts', () => {
        testMutation = () => {
          mutations.pinPost(state)
          return getters.currentlyPinnedPosts(state)
        }
        expect(testMutation()).toBe(1)
      })
    })

    describe('unpinPost', () => {
      it('decrements currentlyPinnedPosts', () => {
        state.currentlyPinnedPosts = 2
        testMutation = () => {
          mutations.unpinPost(state)
          return getters.currentlyPinnedPosts(state)
        }
        expect(testMutation()).toBe(1)
      })
    })

    describe('setCurrentlyPinnedPosts', () => {
      it('sets currentlyPinnedPosts', () => {
        state.currentlyPinnedPosts = 3
        testMutation = () => {
          mutations.setCurrentlyPinnedPosts(state, 1)
          return getters.currentlyPinnedPosts(state)
        }
        expect(testMutation()).toBe(1)
      })
    })

    describe('setLoaded', () => {
      it('marks the count as loaded', () => {
        state.loaded = false
        testMutation = () => {
          mutations.setLoaded(state)
          return getters.loaded(state)
        }
        expect(testMutation()).toBe(true)
      })
    })
  })

  describe('actions', () => {
    const queryMock = jest.fn().mockResolvedValue({
      data: {
        PostsPinnedCounts: {
          currentlyPinnedPosts: 2,
        },
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
      action = actions.fetch.bind(module)
    })

    describe('fetch', () => {
      beforeEach(async () => {
        await action({ commit })
      })

      it('calls apollo', () => {
        expect(queryMock).toHaveBeenCalledWith({
          query: postsPinnedCountsQuery(),
        })
      })

      it('commits setCurrentlyPinnedPosts', () => {
        expect(commit).toHaveBeenCalledWith('setCurrentlyPinnedPosts', 2)
      })

      it('commits setLoaded', () => {
        expect(commit).toHaveBeenCalledWith('setLoaded')
      })
    })
  })
})
