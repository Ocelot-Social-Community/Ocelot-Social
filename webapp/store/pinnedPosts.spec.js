import { state as initialState, mutations, getters, actions } from './pinnedPosts'
import { postsPinnedCountsQuery } from '~/graphql/PostQuery'

describe('pinned post store', () => {
  describe('initial state', () => {
    it('sets all values to 0', () => {
      expect(initialState()).toEqual({
        maxPinnedPosts: 0,
        currentlyPinnedPosts: 0,
      })
    })
  })

  describe('mutations', () => {
    let testMutation
    const state = {
      maxPinnedPosts: 0,
      currentlyPinnedPosts: 0,
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

    describe('setMaxPinnedPosts', () => {
      it('sets maxPinnedPosts correctly', () => {
        state.maxPinnedPosts = 3
        testMutation = () => {
          mutations.setMaxPinnedPosts(state, 1)
          return getters.maxPinnedPosts(state)
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
  })

  describe('actions', () => {
    const queryMock = jest.fn().mockResolvedValue({
      data: {
        PostsPinnedCounts: {
          maxPinnedPosts: 3,
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
        expect(queryMock).toBeCalledWith({
          query: postsPinnedCountsQuery(),
        })
      })

      it('commits setMaxPinnedPosts', () => {
        expect(commit).toBeCalledWith('setMaxPinnedPosts', 3)
      })

      it('commits setCurrentlyPinnedPosts', () => {
        expect(commit).toBeCalledWith('setCurrentlyPinnedPosts', 2)
      })
    })
  })
})
