import { shallowMount, mount } from '@vue/test-utils'
import PostIndex from './index.vue'
import Vuex from 'vuex'
import HashtagsFilter from '~/components/HashtagsFilter/HashtagsFilter'
import { filterPosts } from '~/graphql/PostQuery.js'

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
        'posts/filteredPostTypes': () => [],
        'posts/articleSetInPostTypeFilter': () => false,
        'posts/eventSetInPostTypeFilter': () => false,
        'posts/eventsEnded': () => '',
        'posts/orderBy': () => 'sortDate_desc',
        'auth/user': () => {
          return { id: 'u23' }
        },
        'categories/categories': () => ['cat1', 'cat2', 'cat3'],
      },
      mutations,
      actions: {
        'categories/init': jest.fn(),
      },
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
        replace: jest.fn(),
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
        expect(mutations['posts/RESET_CATEGORIES']).toHaveBeenCalled()
      })

      it('sets the category', () => {
        expect(mutations['posts/TOGGLE_CATEGORY']).toHaveBeenCalledWith({}, 'cat3')
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
      it('hides donation-info on default', () => {
        wrapper = Wrapper()
        expect(wrapper.find('.top-info-bar').exists()).toBe(false)
      })

      it('shows donation-info if "showDonations"', async () => {
        wrapper = Wrapper()
        await wrapper.setData({ showDonations: true })
        expect(wrapper.find('.top-info-bar').exists()).toBe(true)
      })
    })
  })

  describe('Post apollo query (filterPosts wiring)', () => {
    const { apollo } = PostIndex

    it('wires the Post query to the filterPosts builder', () => {
      expect(apollo.Post.query()).toBe(filterPosts())
    })

    it('derives variables from the final filters, page size and ordering (pinned first)', () => {
      const ctx = { finalFilters: { categoryId: 'cat1' }, pageSize: 12, orderBy: 'sortDate_desc' }
      expect(apollo.Post.variables.call(ctx)).toEqual({
        filter: { categoryId: 'cat1' },
        first: 12,
        orderBy: ['pinned_asc', 'sortDate_desc'],
        offset: 0,
      })
    })

    it('update() stores the returned posts', () => {
      const ctx = { posts: [] }
      apollo.Post.update.call(ctx, { Post: [{ id: 'p1' }] })
      expect(ctx.posts).toEqual([{ id: 'p1' }])
    })

    // The template reads `posts.length` unguarded, so update() must always
    // leave an array behind even when Apollo yields a null/partial response.
    it.each([
      ['null', { Post: null }],
      ['undefined', { Post: undefined }],
      ['an empty response', {}],
    ])('update() falls back to an empty array when Post is %s', (_label, data) => {
      const ctx = { posts: [{ id: 'stale' }] }
      apollo.Post.update.call(ctx, data)
      expect(ctx.posts).toEqual([])
    })
  })

  describe('finalFilters computed (feeds the Post query variables)', () => {
    const { finalFilters } = PostIndex.computed

    it('passes the store filter through unchanged when no hashtag is active', () => {
      const ctx = { postsFilter: { categories_some: { id: 'cat1' } }, hashtag: null }
      expect(finalFilters.call(ctx)).toEqual({ categories_some: { id: 'cat1' } })
    })

    it('merges a tags_some filter for the active hashtag', () => {
      const ctx = { postsFilter: { categories_some: { id: 'cat1' } }, hashtag: 'h1' }
      expect(finalFilters.call(ctx)).toEqual({
        categories_some: { id: 'cat1' },
        tags_some: { id: 'h1' },
      })
    })
  })
})
