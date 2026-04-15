import { mount } from '@vue/test-utils'
import create, { __resetSharedDraftForTests } from './_type.vue'
import Vuex from 'vuex'

const localVue = global.localVue

describe('create.vue', () => {
  let wrapper
  let routerReplace
  let mocks

  const makeMocks = ({ type = 'article', query = {} } = {}) => ({
    $t: jest.fn((key) => key),
    $route: {
      path: `/post/create/${type}`,
      params: { type },
      query,
    },
    $router: {
      replace: routerReplace,
    },
    $i18n: { locale: () => 'en' },
    $toast: { error: jest.fn(), success: jest.fn() },
  })

  const stubs = {
    ContributionForm: true,
    'os-menu': true,
    'os-menu-item': true,
    'nuxt-link': true,
    'os-button': true,
    'os-icon': true,
  }

  const currentUser = { id: 'u1', name: 'Current User', slug: 'current-user' }

  const store = new Vuex.Store({
    getters: {
      'auth/user': () => currentUser,
      'categories/categoriesActive': () => false,
    },
  })

  const Wrapper = (customMocks = mocks) => {
    return mount(create, { mocks: customMocks, localVue, stubs, store })
  }

  beforeEach(() => {
    routerReplace = jest.fn()
    mocks = makeMocks()
    __resetSharedDraftForTests()
  })

  describe('mount', () => {
    it('renders', () => {
      wrapper = Wrapper()
      expect(wrapper.findComponent({ name: 'ContributionForm' }).exists()).toBe(true)
    })

    it('does not strip a preserved groupId from the URL on mount', () => {
      mocks = makeMocks({ query: { groupId: 'g1' } })
      wrapper = Wrapper()
      expect(routerReplace).not.toHaveBeenCalled()
    })

    it('seeds draft.groupId from the URL query on first-time arrival', () => {
      mocks = makeMocks({ query: { groupId: 'g1' } })
      wrapper = Wrapper()
      expect(wrapper.vm.draft.groupId).toBe('g1')
    })

    it('does not overwrite an existing draft.groupId with a stale URL query', () => {
      mocks = makeMocks()
      const first = Wrapper()
      first.vm.draft.groupId = 'g2'
      first.destroy()
      mocks = makeMocks({ query: { groupId: 'g1' } })
      const second = Wrapper()
      expect(second.vm.draft.groupId).toBe('g2')
    })
  })

  describe('post-in selector UI', () => {
    it('renders the personal profile link when no group is selected', () => {
      wrapper = Wrapper()
      const link = wrapper.find('[data-test="post-in-link"]')
      expect(link.exists()).toBe(true)
      expect(link.text()).toBe('Current User')
    })

    it('shows the selected group name when a group is chosen', async () => {
      wrapper = Wrapper()
      wrapper.setData({
        myGroups: [{ id: 'g1', name: 'Some Group', slug: 'some-group' }],
      })
      wrapper.vm.draft.groupId = 'g1'
      await wrapper.vm.$nextTick()
      const link = wrapper.find('[data-test="post-in-link"]')
      expect(link.text()).toBe('Some Group')
    })

    it('shows the group icon in the trigger when a group is selected', async () => {
      wrapper = Wrapper()
      expect(wrapper.find('[data-test="post-in-trigger-icon"]').exists()).toBe(false)
      wrapper.setData({
        myGroups: [{ id: 'g1', name: 'Some Group', slug: 'some-group' }],
      })
      wrapper.vm.draft.groupId = 'g1'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="post-in-trigger-icon"]').exists()).toBe(true)
    })

    it('renders a native select overlay with all context options', async () => {
      wrapper = Wrapper()
      wrapper.setData({
        myGroups: [
          { id: 'g1', name: 'One', slug: 'one' },
          { id: 'g2', name: 'Two', slug: 'two' },
        ],
      })
      await wrapper.vm.$nextTick()
      const select = wrapper.find('[data-test="post-in-select"]')
      expect(select.exists()).toBe(true)
      const options = select.findAll('option')
      expect(options).toHaveLength(3)
      expect(options.at(0).attributes('value')).toBe('')
      expect(options.at(1).attributes('value')).toBe('g1')
      expect(options.at(2).attributes('value')).toBe('g2')
    })

    it('does not render a nuxt-link to the profile — the selector is the only entry point', () => {
      wrapper = Wrapper()
      expect(wrapper.findComponent({ name: 'NuxtLink' }).exists()).toBe(false)
    })

    it('reflects the current draft.groupId as the select value', async () => {
      wrapper = Wrapper()
      wrapper.setData({
        myGroups: [{ id: 'g1', name: 'One' }],
      })
      wrapper.vm.draft.groupId = 'g1'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="post-in-select"]').element.value).toBe('g1')
    })

    it('re-syncs the native select value once async myGroups arrive (URL ?groupId=g1 case)', async () => {
      // Simulate arriving with ?groupId=g1 while Apollo has not yet resolved.
      // Initially the <option value="g1"> does not exist, so the native select
      // silently defaults to the first option ("") — we verify the watcher
      // corrects the DOM value once the group option appears.
      mocks = makeMocks({ type: 'article', query: { groupId: 'g1' } })
      wrapper = Wrapper()
      const select = wrapper.find('[data-test="post-in-select"]').element
      expect(select.value).toBe('')
      wrapper.setData({
        myGroups: [{ id: 'g1', name: 'Group One' }],
      })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      expect(select.value).toBe('g1')
    })
  })

  describe('switchPostType', () => {
    it('navigates to the new type while preserving draft.groupId', () => {
      mocks = makeMocks({ type: 'article', query: { groupId: 'g1' } })
      wrapper = Wrapper()
      wrapper.vm.switchPostType(null, { route: { type: 'event' } })
      expect(routerReplace).toHaveBeenCalledWith({
        path: '/post/create/event',
        query: { groupId: 'g1' },
      })
    })

    it('navigates without groupId when none is selected', () => {
      wrapper = Wrapper()
      wrapper.vm.switchPostType(null, { route: { type: 'event' } })
      expect(routerReplace).toHaveBeenCalledWith({
        path: '/post/create/event',
        query: {},
      })
    })

    it('is a no-op when the new type matches the current one', () => {
      wrapper = Wrapper()
      wrapper.vm.switchPostType(null, { route: { type: 'article' } })
      expect(routerReplace).not.toHaveBeenCalled()
    })

    it('passes the draft into ContributionForm via externalFormData', () => {
      wrapper = Wrapper()
      const form = wrapper.findComponent({ name: 'ContributionForm' })
      expect(form.props('externalFormData')).toBe(wrapper.vm.draft)
    })
  })

  describe('draft persistence across page remount', () => {
    it('shares full draft (content + selected group) between two page instances', () => {
      mocks = makeMocks({ type: 'article', query: { groupId: 'g1' } })
      const first = Wrapper()
      first.vm.draft.title = 'Half-written draft'
      first.vm.draft.eventVenue = 'Some venue'
      first.vm.draft.categoryIds = ['cat-1', 'cat-2']
      first.destroy()

      mocks = makeMocks({ type: 'event', query: { groupId: 'g1' } })
      const second = Wrapper()
      expect(second.vm.draft.title).toBe('Half-written draft')
      expect(second.vm.draft.eventVenue).toBe('Some venue')
      expect(second.vm.draft.categoryIds).toEqual(['cat-1', 'cat-2'])
      expect(second.vm.draft.groupId).toBe('g1')
    })

    it('resets the shared draft when leaving the post-create flow', () => {
      wrapper = Wrapper()
      wrapper.vm.draft.title = 'Abandoned draft'
      wrapper.vm.draft.groupId = 'g1'
      const next = jest.fn()
      const leave = create.beforeRouteLeave
      leave.call(wrapper.vm, { path: '/some/other/page' }, {}, next)
      expect(next).toHaveBeenCalled()

      const fresh = Wrapper()
      expect(fresh.vm.draft.title).toBe('')
      expect(fresh.vm.draft.groupId).toBeNull()
    })

    it('keeps the shared draft when navigating within the post-create flow', () => {
      wrapper = Wrapper()
      wrapper.vm.draft.title = 'Still editing'
      wrapper.vm.draft.groupId = 'g1'
      const next = jest.fn()
      const leave = create.beforeRouteLeave
      leave.call(wrapper.vm, { path: '/post/create/event' }, {}, next)
      expect(next).toHaveBeenCalled()

      const fresh = Wrapper()
      expect(fresh.vm.draft.title).toBe('Still editing')
      expect(fresh.vm.draft.groupId).toBe('g1')
    })

    it('preserves event-only fields when switching from article to event and back', () => {
      mocks = makeMocks({ type: 'article' })
      const articleBeforeSwitch = Wrapper()
      articleBeforeSwitch.vm.draft.title = 'Keep me'
      articleBeforeSwitch.vm.draft.eventVenue = 'Berlin HQ'
      articleBeforeSwitch.vm.draft.eventIsOnline = true
      articleBeforeSwitch.destroy()

      mocks = makeMocks({ type: 'event' })
      const asEvent = Wrapper()
      expect(asEvent.vm.draft.eventVenue).toBe('Berlin HQ')
      expect(asEvent.vm.draft.eventIsOnline).toBe(true)
      asEvent.vm.draft.eventStart = '2026-06-01T12:00:00'
      asEvent.destroy()

      mocks = makeMocks({ type: 'article' })
      const backToArticle = Wrapper()
      expect(backToArticle.vm.draft.title).toBe('Keep me')
      expect(backToArticle.vm.draft.eventStart).toBe('2026-06-01T12:00:00')
    })
  })

  describe('onSelectChange', () => {
    it('sets draft.groupId and syncs the URL query when a group is picked', () => {
      wrapper = Wrapper()
      wrapper.vm.onSelectChange({ target: { value: 'g1' } })
      expect(wrapper.vm.draft.groupId).toBe('g1')
      expect(routerReplace).toHaveBeenCalledWith({
        path: '/post/create/article',
        query: { groupId: 'g1' },
      })
    })

    it('clears draft.groupId and strips the URL query when Personal profile is picked', () => {
      mocks = makeMocks({ type: 'article', query: { groupId: 'g1' } })
      wrapper = Wrapper()
      wrapper.vm.onSelectChange({ target: { value: '' } })
      expect(wrapper.vm.draft.groupId).toBeNull()
      expect(routerReplace).toHaveBeenCalledWith({
        path: '/post/create/article',
        query: {},
      })
    })

    it('skips the router replace when the URL already matches', () => {
      mocks = makeMocks({ type: 'article', query: { groupId: 'g1' } })
      wrapper = Wrapper()
      wrapper.vm.onSelectChange({ target: { value: 'g1' } })
      expect(routerReplace).not.toHaveBeenCalled()
    })
  })

  describe('selectedGroup', () => {
    it('resolves to the matching group from myGroups', async () => {
      wrapper = Wrapper()
      wrapper.setData({
        myGroups: [
          { id: 'g1', name: 'Group One' },
          { id: 'g2', name: 'Group Two' },
        ],
        draft: { ...wrapper.vm.draft, groupId: 'g2' },
      })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.selectedGroup).toEqual({ id: 'g2', name: 'Group Two' })
    })

    it('is null when draft.groupId is not set', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.selectedGroup).toBeNull()
    })

    it('is null when draft.groupId does not match any known group', async () => {
      wrapper = Wrapper()
      wrapper.setData({
        myGroups: [{ id: 'g1', name: 'Group One' }],
        draft: { ...wrapper.vm.draft, groupId: 'g-unknown' },
      })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.selectedGroup).toBeNull()
    })
  })
})
