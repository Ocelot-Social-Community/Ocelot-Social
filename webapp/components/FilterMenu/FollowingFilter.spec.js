import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import FollowingFilter from './FollowingFilter'

const localVue = global.localVue

let wrapper

describe('FollowingFilter', () => {
  const mutations = {
    'posts/TOGGLE_FILTER_BY_FOLLOWED': jest.fn(),
    'posts/TOGGLE_FILTER_BY_MY_GROUPS': jest.fn(),
    'posts/RESET_FOLLOWERS_FILTER': jest.fn(),
  }
  const getters = {
    'auth/user': () => {
      return { id: 'u34' }
    },
    'posts/filteredByUsersFollowed': jest.fn(),
    'posts/filteredByPostsInMyGroups': jest.fn(),
  }

  const mocks = {
    $t: jest.fn((string) => string),
  }

  const Wrapper = () => {
    const store = new Vuex.Store({ mutations, getters })
    const wrapper = mount(FollowingFilter, { mocks, localVue, store })
    return wrapper
  }

  beforeEach(() => {
    wrapper = Wrapper()
  })

  describe('mount', () => {
    it('sets "filter-by-followed" button attribute `filled`', () => {
      getters['posts/filteredByUsersFollowed'] = jest.fn(() => true)
      getters['posts/filteredByPostsInMyGroups'] = jest.fn(() => true)
      const wrapper = Wrapper()
      expect(
        wrapper
          .find('.following-filter .filter-list .follower-item .base-button')
          .classes('--filled'),
      ).toBe(true)
      expect(
        wrapper
          .find('.following-filter .filter-list .posts-in-my-groups-item .base-button')
          .classes('--filled'),
      ).toBe(true)
    })

    describe('click "filter-by-followed" button', () => {
      it('calls TOGGLE_FILTER_BY_FOLLOWED', () => {
        wrapper.find('.following-filter .filter-list .follower-item .base-button').trigger('click')
        expect(mutations['posts/TOGGLE_FILTER_BY_FOLLOWED']).toHaveBeenCalledWith({}, 'u34')
      })
    })

    describe('click "filter-by-my-groups" button', () => {
      it('calls TOGGLE_FILTER_BY_MY_GROUPS', () => {
        wrapper
          .find('.following-filter .filter-list .posts-in-my-groups-item .base-button')
          .trigger('click')
        expect(mutations['posts/TOGGLE_FILTER_BY_MY_GROUPS']).toHaveBeenCalled()
      })
    })
    describe('clears follower filter', () => {
      it('when all button is clicked', async () => {
        wrapper = await Wrapper()
        const clearFollowerButton = wrapper.find(
          '.following-filter .item-all-follower .base-button',
        )
        clearFollowerButton.trigger('click')
        expect(mutations['posts/RESET_FOLLOWERS_FILTER']).toHaveBeenCalledTimes(1)
      })
    })
  })
})
