import { shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import UserAvatarNonAnonymous from './UserAvatarNonAnonymous.vue'

const localVue = global.localVue

const user = { id: 'u1', name: 'Jane Doe', slug: 'jane-doe' }
const group = { id: 'g1', name: 'Test Group', slug: 'test-group' }

const makeStore = (authUser = {}) =>
  new Vuex.Store({
    getters: {
      'auth/user': () => authUser,
    },
  })

const makeApolloMock = (resolveOrReject = 'resolve') => {
  const fn = jest.fn()
  if (resolveOrReject === 'resolve') {
    fn.mockResolvedValue({ data: {} })
  } else {
    fn.mockRejectedValue(new Error('Apollo error'))
  }
  return fn
}

const Wrapper = ({ apolloQuery = makeApolloMock(), groupProp = null, authUser = {} } = {}) =>
  shallowMount(UserAvatarNonAnonymous, {
    localVue,
    store: makeStore(authUser),
    propsData: { user, group: groupProp },
    mocks: {
      $t: jest.fn((t) => t),
      $i18n: { locale: jest.fn(() => 'en') },
      $apollo: { query: apolloQuery },
    },
    stubs: { NuxtLink: true },
  })

describe('UserAvatarNonAnonymous', () => {
  describe('mounted()', () => {
    it('pre-fetches group data when group has an id', () => {
      const apolloQuery = makeApolloMock()
      Wrapper({ apolloQuery, groupProp: group })
      expect(apolloQuery).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 'g1' } }))
    })

    it('does not query when group prop is absent', () => {
      const apolloQuery = makeApolloMock()
      Wrapper({ apolloQuery, groupProp: null })
      expect(apolloQuery).not.toHaveBeenCalled()
    })
  })

  describe('groupLink computed', () => {
    it('returns null when group has no id', () => {
      const wrapper = Wrapper({ groupProp: { name: 'No ID' } })
      expect(wrapper.vm.groupLink).toBeNull()
    })

    it('returns route object when group has id and slug', () => {
      const wrapper = Wrapper({ groupProp: group })
      expect(wrapper.vm.groupLink).toEqual({
        name: 'groups-id-slug',
        params: { id: 'g1', slug: 'test-group' },
      })
    })
  })

  describe('cancelAndClose()', () => {
    it('resets popoverPending and calls closeMenu(false)', () => {
      const wrapper = Wrapper()
      wrapper.vm.popoverPending = true
      const closeMenu = jest.fn()
      wrapper.vm.cancelAndClose(closeMenu)
      expect(wrapper.vm.popoverPending).toBe(false)
      expect(closeMenu).toHaveBeenCalledWith(false)
    })
  })

  describe('cancelAndCloseGroup()', () => {
    it('resets groupPopoverPending and calls closeMenu(false)', () => {
      const wrapper = Wrapper({ groupProp: group })
      wrapper.vm.groupPopoverPending = true
      const closeMenu = jest.fn()
      wrapper.vm.cancelAndCloseGroup(closeMenu)
      expect(wrapper.vm.groupPopoverPending).toBe(false)
      expect(closeMenu).toHaveBeenCalledWith(false)
    })
  })

  describe('loadGroupPopover()', () => {
    it('calls openMenu when query resolves', async () => {
      const wrapper = Wrapper({ groupProp: group })
      const openMenu = jest.fn()
      await wrapper.vm.loadGroupPopover(openMenu)
      expect(openMenu).toHaveBeenCalledWith(false)
    })

    it('does not call openMenu when query rejects', async () => {
      const apolloQuery = makeApolloMock('reject')
      const wrapper = Wrapper({ apolloQuery, groupProp: group })
      const openMenu = jest.fn()
      await wrapper.vm.loadGroupPopover(openMenu)
      expect(openMenu).not.toHaveBeenCalled()
      expect(wrapper.vm.groupPopoverPending).toBe(false)
    })

    it('does not call openMenu when cancelled before query resolves', async () => {
      let resolveQuery
      const apolloQuery = jest.fn(() => new Promise((resolve) => (resolveQuery = resolve)))
      const wrapper = Wrapper({ apolloQuery, groupProp: group })
      const openMenu = jest.fn()
      const closeMenu = jest.fn()
      const loading = wrapper.vm.loadGroupPopover(openMenu)
      wrapper.vm.cancelAndCloseGroup(closeMenu)
      resolveQuery({ data: {} })
      await loading
      expect(openMenu).not.toHaveBeenCalled()
      expect(wrapper.vm.groupPopoverPending).toBe(false)
    })
  })

  describe('loadPopover()', () => {
    it('does not call openMenu when query rejects', async () => {
      const apolloQuery = makeApolloMock('reject')
      const wrapper = Wrapper({ apolloQuery })
      const openMenu = jest.fn()
      await wrapper.vm.loadPopover(openMenu)
      expect(openMenu).not.toHaveBeenCalled()
      expect(wrapper.vm.popoverPending).toBe(false)
    })
  })

  describe('dateTime slot', () => {
    const mountWithSlot = (dateTimeProp) =>
      shallowMount(UserAvatarNonAnonymous, {
        localVue,
        store: makeStore(),
        propsData: { user, group: null, dateTime: dateTimeProp },
        mocks: {
          $t: jest.fn((t) => t),
          $i18n: { locale: jest.fn(() => 'en') },
          $apollo: { query: makeApolloMock() },
        },
        stubs: { NuxtLink: true },
        slots: { dateTime: '<span class="edit-hint">edited</span>' },
      })

    it('renders slot content when dateTime prop is provided', () => {
      const wrapper = mountWithSlot('2024-01-01T00:00:00Z')
      expect(wrapper.find('.edit-hint').exists()).toBe(true)
    })

    it('does not render the dateTime area when dateTime prop is absent', () => {
      const wrapper = mountWithSlot(null)
      expect(wrapper.find('.edit-hint').exists()).toBe(false)
    })
  })
})
