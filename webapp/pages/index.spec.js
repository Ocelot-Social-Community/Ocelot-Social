import { shallowMount, mount } from '@vue/test-utils'
import PostIndex from './index.vue'
import Vuex from 'vuex'
import HashtagsFilter from '~/components/HashtagsFilter/HashtagsFilter'

const localVue = global.localVue

const stubs = {
  'client-only': true,
  'router-link': true,
  'nuxt-link': true,
  'infinite-loading': true,
}

describe('PostIndex', () => {
  let wrapper
  let Wrapper
  let store
  let mocks
  let mutations

  beforeEach(() => {
    mutations = {
      'posts/TOGGLE_ORDER': jest.fn(),
      'posts/RESET_CATEGORIES': jest.fn(),
      'posts/TOGGLE_CATEGORY': jest.fn(),
    }
    store = new Vuex.Store({
      getters: {
        'posts/filter': () => ({}),
        'posts/orderBy': () => 'createdAt_desc',
        'auth/user': () => {
          return { id: 'u23' }
        },
      },
      mutations,
    })
    mocks = {
      $t: (key) => key,
      $filters: {
        truncate: (a) => a,
        removeLinks: jest.fn(),
      },
      $i18n: {
        locale: () => 'de',
      },
      // If you are mocking router, than don't use VueRouter with localVue: https://vue-test-utils.vuejs.org/guides/using-with-vue-router.html
      $router: {
        history: {
          push: jest.fn(),
        },
        push: jest.fn(),
      },
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $apollo: {
        mutate: jest.fn().mockResolvedValue(),
        queries: {
          Post: {
            refetch: jest.fn(),
            fetchMore: jest.fn().mockResolvedValue([
              {
                id: 'p23',
                name: 'It is a post',
                author: {
                  id: 'u1',
                },
              },
            ]),
          },
        },
      },
      $route: {
        query: {},
      },
      $env: {
        CATEGORIES_ACTIVE: true,
      },
    }
  })

  describe('shallowMount', () => {
    Wrapper = () => {
      return shallowMount(PostIndex, {
        store,
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('clears the search when the filter menu emits clearSearch', () => {
      mocks.$route.query.hashtag = '#samplehashtag'
      wrapper = Wrapper()
      wrapper.findComponent(HashtagsFilter).vm.$emit('clearSearch')
      expect(wrapper.vm.hashtag).toBeNull()
    })

    describe('category filter', () => {
      beforeEach(() => {
        mocks.$route.query = {
          categoryId: 'cat3',
        }
        wrapper = Wrapper()
      })

      it('resets the category filter', () => {
        expect(mutations['posts/RESET_CATEGORIES']).toBeCalled()
      })

      it('sets the category', () => {
        expect(mutations['posts/TOGGLE_CATEGORY']).toBeCalledWith({}, 'cat3')
      })
    })
  })

  describe('mount', () => {
    Wrapper = () => {
      return mount(PostIndex, {
        store,
        mocks,
        localVue,
        stubs,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    describe('donation-info', () => {
      it('shows donation-info on default', () => {
        wrapper = Wrapper()
        expect(wrapper.find('.top-info-bar').exists()).toBe(true)
      })

      it('hides donation-info if not "showDonations"', async () => {
        wrapper = Wrapper()
        await wrapper.setData({ showDonations: false })
        expect(wrapper.find('.top-info-bar').exists()).toBe(false)
      })
    })
  })
})
