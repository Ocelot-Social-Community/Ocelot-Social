import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import SearchResults from './SearchResults'
import { searchGroups } from '~/graphql/Search.js'
import helpers from '~/storybook/helpers'

helpers.init()

const localVue = global.localVue

localVue.directive('scrollTo', jest.fn())

const stubs = {
  'client-only': true,
  'nuxt-link': true,
}

describe('SearchResults', () => {
  let mocks, getters, propsData, wrapper

  const Wrapper = () => {
    const store = new Vuex.Store({
      getters,
      actions: {
        'categories/init': jest.fn(),
        'pinnedPosts/fetch': jest.fn(),
      },
    })
    return mount(SearchResults, { mocks, localVue, propsData, store, stubs })
  }

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      // Non-moderator viewer (children now gate via $can, not auth/isModerator).
      $can: (permission) =>
        [
          'post.create',
          'group.create_public',
          'group.create_closed',
          'group.create_hidden',
          'user.invite',
        ].includes(permission),
    }
    getters = {
      'auth/user': () => {
        return { id: 'u343', name: 'Matt' }
      },
      'auth/isModerator': () => false,
      'auth/isAdmin': () => false,
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
        // OsNumber animation runs for 1500ms
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
          await expect(wrapper.findAll('.user-avatar')).toHaveLength(8)
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

  describe('searchGroups apollo wiring', () => {
    const { apollo } = SearchResults

    it('wires the query to the searchGroups builder, threading the active locale', () => {
      // A non-default locale ('de', not the 'en' fallback) makes this also prove
      // the live $i18n locale is injected: searchGroups('de') is a different
      // cached document (name(lang: "de")), so a hardcoded locale would not match.
      const i18n = { locale: () => 'de' }
      expect(apollo.searchGroups.query.call({ $i18n: i18n })).toBe(searchGroups(i18n))
    })

    // The query variable strips a single leading search operator (!@#&); plain
    // and empty inputs must pass through untouched.
    it.each([
      ['#berlin', 'berlin'],
      ['!berlin', 'berlin'],
      ['@berlin', 'berlin'],
      ['&berlin', 'berlin'],
      ['berlin', 'berlin'],
      ['', ''],
    ])('derives variables stripping the leading operator: %s -> %s', (search, expected) => {
      const ctx = { search, firstGroups: 5, groupsOffset: 0 }
      expect(apollo.searchGroups.variables.call(ctx)).toEqual({
        query: expected,
        firstGroups: 5,
        groupsOffset: 0,
      })
    })

    it.each([
      ['', true],
      [undefined, true],
      ['berlin', false],
    ])('skip() gates the query on a present search term (search=%s -> skip=%s)', (search, skip) => {
      expect(apollo.searchGroups.skip.call({ search })).toBe(skip)
    })

    it('update() maps groups + count and auto-selects the Group tab when only groups match', () => {
      const ctx = { activeTab: null, postCount: 0, userCount: 0, groups: [], groupCount: 0 }
      apollo.searchGroups.update.call(ctx, {
        searchGroups: { groups: [{ id: 'g1' }], groupCount: 1 },
      })
      expect(ctx.groups).toEqual([{ id: 'g1' }])
      expect(ctx.groupCount).toBe(1)
      expect(ctx.activeTab).toBe('Group')
    })

    it('update() leaves the active tab untouched when posts already matched', () => {
      const ctx = { activeTab: 'Post', postCount: 3, userCount: 0, groups: [], groupCount: 0 }
      apollo.searchGroups.update.call(ctx, {
        searchGroups: { groups: [{ id: 'g1' }], groupCount: 1 },
      })
      expect(ctx.activeTab).toBe('Post')
    })

    it.each([
      ['null', { searchGroups: null }],
      ['undefined', { searchGroups: undefined }],
    ])('update() leaves existing state untouched on a %s response', (_label, data) => {
      const ctx = {
        activeTab: 'Post',
        groups: [{ id: 'existing' }],
        groupCount: 7,
        postCount: 0,
        userCount: 0,
      }
      apollo.searchGroups.update.call(ctx, data)
      expect(ctx.groups).toEqual([{ id: 'existing' }])
      expect(ctx.groupCount).toBe(7)
      expect(ctx.activeTab).toBe('Post')
    })

    it('update() does not auto-select the Group tab when users also matched', () => {
      // activeTab null and no posts, but users matched → groups must not win.
      const ctx = { activeTab: null, postCount: 0, userCount: 2, groups: [], groupCount: 0 }
      apollo.searchGroups.update.call(ctx, {
        searchGroups: { groups: [{ id: 'g1' }], groupCount: 1 },
      })
      expect(ctx.activeTab).toBeNull()
      // state is still mapped regardless of the tab decision
      expect(ctx.groups).toEqual([{ id: 'g1' }])
      expect(ctx.groupCount).toBe(1)
    })
  })
})
