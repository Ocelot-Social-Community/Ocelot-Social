import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import _id from './_id.vue'

const localVue = global.localVue

const stubs = {
  ContributionForm: true,
  'os-menu': true,
  'os-menu-item': true,
  'nuxt-link': true,
}

describe('post/edit/_id.vue', () => {
  let wrapper
  let mocks
  let store
  let asyncData
  let error
  let userId
  let authorId

  const makeQuery = (postType = 'Article') =>
    jest.fn().mockResolvedValue({
      data: {
        Post: [{ author: { id: authorId }, postType: [postType] }],
      },
    })

  beforeEach(() => {
    asyncData = false
    error = jest.fn()
    authorId = 'some-author'
    userId = 'some-author'
  })

  const buildWrapper = async ({ query } = {}) => {
    mocks = {
      $t: jest.fn((key) => key),
      $i18n: { locale: () => 'en' },
      apolloProvider: {
        defaultClient: { query: query || makeQuery() },
      },
    }
    store = new Vuex.Store({
      getters: {
        'auth/user': () => ({ id: userId }),
        'categories/categories': jest.fn(() => []),
      },
      actions: {
        'categories/init': jest.fn(),
      },
    })
    let originalData
    if (asyncData) {
      originalData = _id.data
      const data = _id.data ? _id.data() : {}
      const aData = await _id.asyncData({
        app: mocks,
        store,
        error,
        params: { id: '123' },
      })
      _id.data = function () {
        return { ...data, ...aData }
      }
    }
    try {
      return mount(_id, { store, mocks, localVue, stubs })
    } finally {
      if (originalData !== undefined) _id.data = originalData
    }
  }

  describe('mount', () => {
    it('renders', async () => {
      wrapper = await buildWrapper()
      expect(wrapper.findComponent({ name: 'ContributionForm' }).exists()).toBe(true)
    })

    it('renders with asyncData of different users', async () => {
      asyncData = true
      authorId = 'some-author'
      userId = 'some-user'
      wrapper = await buildWrapper()
      expect(error).toHaveBeenCalledWith({
        message: 'error-pages.cannot-edit-post',
        statusCode: 403,
      })
    })

    it('renders with asyncData of same user', async () => {
      asyncData = true
      wrapper = await buildWrapper()
      expect(error).not.toHaveBeenCalled()
    })

    it('sets currentPostType from contribution.postType[0] via asyncData', async () => {
      asyncData = true
      wrapper = await buildWrapper({ query: makeQuery('Event') })
      expect(wrapper.vm.currentPostType).toBe('Event')
    })

    it('defaults currentPostType to Article when contribution has no postType', async () => {
      asyncData = true
      const query = jest.fn().mockResolvedValue({
        data: { Post: [{ author: { id: authorId }, postType: [] }] },
      })
      wrapper = await buildWrapper({ query })
      expect(wrapper.vm.currentPostType).toBe('Article')
    })

    it('defaults currentPostType to Article when postType is null', async () => {
      asyncData = true
      const query = jest.fn().mockResolvedValue({
        data: { Post: [{ author: { id: authorId }, postType: null }] },
      })
      wrapper = await buildWrapper({ query })
      expect(wrapper.vm.currentPostType).toBe('Article')
    })

    it('defaults currentPostType to Article when postType is undefined', async () => {
      asyncData = true
      const query = jest.fn().mockResolvedValue({
        data: { Post: [{ author: { id: authorId }, postType: undefined }] },
      })
      wrapper = await buildWrapper({ query })
      expect(wrapper.vm.currentPostType).toBe('Article')
    })
  })

  describe('switchPostType', () => {
    it('updates currentPostType when switching to Event', async () => {
      wrapper = await buildWrapper()
      wrapper.vm.switchPostType(null, { route: { type: 'Event' } })
      expect(wrapper.vm.currentPostType).toBe('Event')
    })

    it('can switch back to Article', async () => {
      wrapper = await buildWrapper()
      wrapper.vm.switchPostType(null, { route: { type: 'Event' } })
      wrapper.vm.switchPostType(null, { route: { type: 'Article' } })
      expect(wrapper.vm.currentPostType).toBe('Article')
    })
  })

  describe('postTypeMatcher', () => {
    it('returns true for the current type and false for the other', async () => {
      wrapper = await buildWrapper()
      expect(wrapper.vm.postTypeMatcher('', { type: 'Article' })).toBe(true)
      expect(wrapper.vm.postTypeMatcher('', { type: 'Event' })).toBe(false)
    })

    it('reflects changes to currentPostType', async () => {
      wrapper = await buildWrapper()
      wrapper.vm.switchPostType(null, { route: { type: 'Event' } })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.postTypeMatcher('', { type: 'Event' })).toBe(true)
      expect(wrapper.vm.postTypeMatcher('', { type: 'Article' })).toBe(false)
    })
  })

  describe('heading', () => {
    it('shows the article heading by default', async () => {
      wrapper = await buildWrapper()
      expect(wrapper.vm.heading).toBe('post.editPost.title')
    })

    it('shows the event heading when currentPostType is Event', async () => {
      wrapper = await buildWrapper()
      wrapper.vm.switchPostType(null, { route: { type: 'Event' } })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.heading).toBe('post.editPost.event')
    })

    it('reverts to article heading when switching back', async () => {
      wrapper = await buildWrapper()
      wrapper.vm.switchPostType(null, { route: { type: 'Event' } })
      wrapper.vm.switchPostType(null, { route: { type: 'Article' } })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.heading).toBe('post.editPost.title')
    })
  })
})
