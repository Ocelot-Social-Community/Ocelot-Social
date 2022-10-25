import { config, mount } from '@vue/test-utils'
import Vuex from 'vuex'
import SearchResults from './SearchResults'
import helpers from '~/storybook/helpers'

helpers.init()

const localVue = global.localVue

localVue.directive('scrollTo', jest.fn())

config.stubs['client-only'] = '<span><slot /></span>'
config.stubs['nuxt-link'] = '<span><slot /></span>'

describe('SearchResults', () => {
  let mocks, getters, propsData, wrapper
  const Wrapper = () => {
    const store = new Vuex.Store({
      getters,
    })
    return mount(SearchResults, { mocks, localVue, propsData, store })
  }

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $env: {
        CATEGORIES_ACTIVE: false,
      },
    }
    getters = {
      'auth/user': () => {
        return { id: 'u343', name: 'Matt' }
      },
      'auth/isModerator': () => false,
    }
    propsData = {
      pageSize: 12,
      search: '',
    }
    wrapper = Wrapper()
  })

  describe('mount', () => {
    it('renders tab-navigation component', () => {
      expect(wrapper.find('.tab-navigation').exists()).toBe(true)
    })

    describe('searchResults', () => {
      describe('contains no results', () => {
        it('renders hc-empty component', () => {
          expect(wrapper.find('.hc-empty').exists()).toBe(true)
        })
      })

      describe('result contains 25 posts, 8 users and 0 hashtags', () => {
        // we couldn't get it running with "jest.runAllTimers()" and so we used "setTimeout"
        // time is a bit more then 3000 milisec see "webapp/components/CountTo.vue"
        const counterTimeout = 3000 + 10

        beforeEach(async () => {
          wrapper.setData({
            posts: helpers.fakePost(12),
            postCount: 25,
            users: helpers.fakeUser(8),
            userCount: 8,
            activeTab: 'Post',
          })
        })

        it('shows a total of 33 results', () => {
          setTimeout(() => {
            expect(wrapper.find('.total-search-results').text()).toContain('33')
          }, counterTimeout)
        })

        it('shows tab with 25 posts found', () => {
          setTimeout(() => {
            expect(wrapper.find('[data-test="Post-tab"]').text()).toContain('25')
          }, counterTimeout)
        })

        it('shows tab with 8 users found', () => {
          setTimeout(() => {
            expect(wrapper.find('[data-test="User-tab"]').text()).toContain('8')
          }, counterTimeout)
        })

        it('shows tab with 0 hashtags found', () => {
          setTimeout(() => {
            expect(wrapper.find('[data-test="Hashtag-tab"]').text()).toContain('0')
          }, counterTimeout)
        })

        it('has post tab as active tab', () => {
          expect(wrapper.find('[data-test="Post-tab"]').classes('--active')).toBe(true)
        })

        it('has user tab inactive', () => {
          expect(wrapper.find('[data-test="User-tab"]').classes('--active')).toBe(false)
        })

        it('has hashtag tab disabled', () => {
          expect(wrapper.find('[data-test="Hashtag-tab"]').classes('--disabled')).toBe(true)
        })

        it('displays 12 (pageSize) posts', () => {
          expect(wrapper.findAll('.post-teaser')).toHaveLength(12)
        })

        it('has post tab inactive after emitting switch-tab', async () => {
          wrapper.find('.tab-navigation').vm.$emit('switch-tab', 'User') // emits direct from tab component to search results
          await wrapper.vm.$nextTick()
          await expect(wrapper.find('[data-test="Post-tab"]').classes('--active')).toBe(false)
        })

        it('has post tab inactive after clicking on user tab', async () => {
          wrapper.find('[data-test="User-tab-click"]').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(wrapper.find('[data-test="Post-tab"]').classes('--active')).toBe(false)
        })

        it('has user tab active after clicking on user tab', async () => {
          wrapper.find('[data-test="User-tab-click"]').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(wrapper.find('[data-test="User-tab"]').classes('--active')).toBe(true)
        })

        it('displays 8 users after clicking on user tab', async () => {
          wrapper.find('[data-test="User-tab-click"]').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(wrapper.findAll('.user-teaser')).toHaveLength(8)
        })

        it('shows the pagination buttons for posts', () => {
          expect(wrapper.find('.pagination-buttons').exists()).toBe(true)
        })

        it('shows no pagination buttons for users', async () => {
          wrapper.find('[data-test="User-tab-click"]').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(wrapper.find('.pagination-buttons').exists()).toBe(false)
        })

        it('displays page 1 of 3 for the 25 posts', () => {
          expect(wrapper.find('.pagination-pageCount').text().replace(/\s+/g, ' ')).toContain(
            '1 / 3',
          )
        })

        it('displays the next page button for the 25 posts', () => {
          expect(wrapper.find('.next-button').exists()).toBe(true)
        })

        it('deactivates previous page button for the 25 posts', () => {
          const previousButton = wrapper.find('[data-test="previous-button"]')
          expect(previousButton.attributes().disabled).toEqual('disabled')
        })

        it('displays page 2 / 3 when next-button is clicked', async () => {
          wrapper.find('.next-button').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(wrapper.find('.pagination-pageCount').text().replace(/\s+/g, ' ')).toContain(
            '2 / 3',
          )
        })

        it('sets apollo searchPosts offset to 12 when next-button is clicked', async () => {
          wrapper.find('.next-button').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(
            wrapper.vm.$options.apollo.searchPosts.variables.bind(wrapper.vm)(),
          ).toMatchObject({ query: '', firstPosts: 12, postsOffset: 12 })
        })

        it('displays the next page button when next-button is clicked', async () => {
          wrapper.find('.next-button').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(wrapper.find('.next-button').exists()).toBe(true)
        })

        it('displays the previous page button when next-button is clicked', async () => {
          wrapper.find('.next-button').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(wrapper.find('.previous-button').exists()).toBe(true)
        })

        it('displays page 3 / 3 when next-button is clicked twice', async () => {
          wrapper.find('.next-button').trigger('click')
          wrapper.find('.next-button').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(wrapper.find('.pagination-pageCount').text().replace(/\s+/g, ' ')).toContain(
            '3 / 3',
          )
        })

        it('sets apollo searchPosts offset to 24 when next-button is clicked twice', async () => {
          wrapper.find('.next-button').trigger('click')
          wrapper.find('.next-button').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(
            wrapper.vm.$options.apollo.searchPosts.variables.bind(wrapper.vm)(),
          ).toMatchObject({ query: '', firstPosts: 12, postsOffset: 24 })
        })

        it('deactivates next page button when next-button is clicked twice', async () => {
          const nextButton = wrapper.find('[data-test="next-button"]')
          nextButton.trigger('click')
          nextButton.trigger('click')
          await wrapper.vm.$nextTick()
          expect(nextButton.attributes().disabled).toEqual('disabled')
        })

        it('displays the previous page button when next-button is clicked twice', async () => {
          wrapper.find('.next-button').trigger('click')
          wrapper.find('.next-button').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(wrapper.find('.previous-button').exists()).toBe(true)
        })

        it('displays page 1 / 3 when previous-button is clicked after next-button', async () => {
          wrapper.find('.next-button').trigger('click')
          await wrapper.vm.$nextTick()
          wrapper.find('.previous-button').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(wrapper.find('.pagination-pageCount').text().replace(/\s+/g, ' ')).toContain(
            '1 / 3',
          )
        })

        it('sets apollo searchPosts offset to 0 when previous-button is clicked after next-button', async () => {
          wrapper.find('.next-button').trigger('click')
          await wrapper.vm.$nextTick()
          wrapper.find('.previous-button').trigger('click')
          await wrapper.vm.$nextTick()
          await expect(
            wrapper.vm.$options.apollo.searchPosts.variables.bind(wrapper.vm)(),
          ).toMatchObject({ query: '', firstPosts: 12, postsOffset: 0 })
        })
      })
    })
  })
})
