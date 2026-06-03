import Vuex from 'vuex'
import { mount, createLocalVue } from '@vue/test-utils'
import CallPage from './_slug.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

const buildStore = (state = {}) => {
  const setMinimized = jest.fn()
  const openVideoCall = jest.fn()
  const closeVideoCall = jest.fn()
  const setGroupInfo = jest.fn()
  const store = new Vuex.Store({
    getters: {
      'videoCall/showVideoCall': () => !!state.showVideoCall,
      'videoCall/groupId': () => state.groupId || null,
      'videoCall/groupName': () => state.groupName || null,
    },
    mutations: {
      'videoCall/SET_MINIMIZED': setMinimized,
      'videoCall/OPEN': openVideoCall,
      'videoCall/CLOSE': closeVideoCall,
      'videoCall/SET_GROUP_INFO': setGroupInfo,
    },
  })
  return { store, setMinimized, openVideoCall, closeVideoCall, setGroupInfo }
}

const factory = (state = {}, routeParams = { id: 'g1', slug: 'group-1' }) => {
  process.client = true
  const built = buildStore(state)
  const $route = {
    name: 'call-id-slug',
    params: routeParams,
  }
  const wrapper = mount(CallPage, {
    localVue,
    store: built.store,
    mocks: {
      $route,
      $t: (k, vars) => (vars ? `${k}:${JSON.stringify(vars)}` : k),
      $i18n: { locale: () => 'en' },
    },
    stubs: {},
  })
  return { wrapper, $route, ...built }
}

describe('CallPage', () => {
  describe('initial showVideoCall watcher', () => {
    it('opens the video call when not yet active and route params are present', () => {
      const { openVideoCall } = factory({ showVideoCall: false })
      expect(openVideoCall).toHaveBeenCalled()
      const payload = openVideoCall.mock.calls[0][1]
      expect(payload).toEqual({ groupId: 'g1', groupSlug: 'group-1', groupName: null })
    })

    it('only maximises when the call is already active', () => {
      const { openVideoCall, setMinimized } = factory({ showVideoCall: true, groupId: 'g1' })
      expect(openVideoCall).not.toHaveBeenCalled()
      expect(setMinimized).toHaveBeenCalled()
      expect(setMinimized.mock.calls[0][1]).toBe(false)
    })

    it('does not open if route params are missing', () => {
      const { openVideoCall } = factory({ showVideoCall: false }, { id: null, slug: null })
      expect(openVideoCall).not.toHaveBeenCalled()
    })
  })

  describe('callTitle', () => {
    it('uses gotoGroup with the name when groupName is set', () => {
      const { wrapper } = factory({ showVideoCall: true, groupName: 'Yoga', groupId: 'g1' })
      expect(wrapper.vm.callTitle).toContain('videoCall.gotoGroup')
      expect(wrapper.vm.callTitle).toContain('Yoga')
    })

    it('falls back to videoCall.title when groupName is missing', () => {
      const { wrapper } = factory({ showVideoCall: true, groupId: 'g1' })
      expect(wrapper.vm.callTitle).toBe('videoCall.title')
    })
  })

  describe('head', () => {
    it('returns the call title', () => {
      const { wrapper } = factory({ showVideoCall: true, groupName: 'Yoga', groupId: 'g1' })
      expect(wrapper.vm.$options.head.call(wrapper.vm).title).toContain('Yoga')
    })
  })

  describe('$route watcher', () => {
    const callWatcher = (wrapper, to, from) =>
      wrapper.vm.$options.watch.$route.call(wrapper.vm, to, from)

    it('returns early when navigating away from the call route', async () => {
      const { wrapper, openVideoCall, setMinimized, closeVideoCall } = factory({
        showVideoCall: true,
        groupId: 'g1',
      })
      openVideoCall.mockClear()
      setMinimized.mockClear()
      await callWatcher(
        wrapper,
        { name: 'other', params: { id: 'g1', slug: 'group-1' } },
        { name: 'call-id-slug', params: { id: 'g1', slug: 'group-1' } },
      )
      expect(openVideoCall).not.toHaveBeenCalled()
      expect(closeVideoCall).not.toHaveBeenCalled()
    })

    it('returns early when re-entering the same group call', async () => {
      const { wrapper, openVideoCall, setMinimized } = factory({
        showVideoCall: true,
        groupId: 'g1',
      })
      openVideoCall.mockClear()
      setMinimized.mockClear()
      await callWatcher(
        wrapper,
        { name: 'call-id-slug', params: { id: 'g1', slug: 'group-1' } },
        { name: 'call-id-slug', params: { id: 'g1', slug: 'group-1' } },
      )
      expect(openVideoCall).not.toHaveBeenCalled()
    })

    it('maximises when re-entering the same group via a different route', async () => {
      const { wrapper, setMinimized } = factory({ showVideoCall: true, groupId: 'g1' })
      setMinimized.mockClear()
      await callWatcher(
        wrapper,
        { name: 'call-id-slug', params: { id: 'g1', slug: 'group-1' } },
        { name: 'groups-id-slug', params: { id: 'g1', slug: 'group-1' } },
      )
      expect(setMinimized).toHaveBeenCalled()
    })

    it('closes and re-opens when switching to a different group', async () => {
      const { wrapper, openVideoCall, closeVideoCall } = factory({
        showVideoCall: true,
        groupId: 'g1',
      })
      openVideoCall.mockClear()
      await callWatcher(
        wrapper,
        { name: 'call-id-slug', params: { id: 'g2', slug: 'group-2' } },
        { name: 'groups-id-slug', params: {} },
      )
      expect(closeVideoCall).toHaveBeenCalled()
      expect(openVideoCall).toHaveBeenCalled()
      expect(openVideoCall.mock.calls[0][1]).toEqual({
        groupId: 'g2',
        groupSlug: 'group-2',
        groupName: null,
      })
    })

    it('opens directly when no call is active', async () => {
      const { wrapper, openVideoCall, closeVideoCall } = factory({ showVideoCall: false })
      openVideoCall.mockClear()
      await callWatcher(
        wrapper,
        { name: 'call-id-slug', params: { id: 'g2', slug: 'group-2' } },
        { name: 'groups-id-slug', params: {} },
      )
      expect(closeVideoCall).not.toHaveBeenCalled()
      expect(openVideoCall).toHaveBeenCalled()
    })

    it('returns early if the target route is missing id/slug', async () => {
      const { wrapper, openVideoCall } = factory({ showVideoCall: false })
      openVideoCall.mockClear()
      await callWatcher(
        wrapper,
        { name: 'call-id-slug', params: { id: null, slug: null } },
        { name: 'groups-id-slug', params: {} },
      )
      expect(openVideoCall).not.toHaveBeenCalled()
    })
  })

  describe('apollo Group', () => {
    const apollo = CallPage.apollo.Group

    it('builds the query via groupQuery', () => {
      const result = apollo.query.call({ $i18n: { locale: () => 'en' } })
      expect(result).toBeDefined()
    })

    it('passes the route id as variables', () => {
      const variables = apollo.variables.call({ $route: { params: { id: 'g1' } } })
      expect(variables).toEqual({ id: 'g1' })
    })

    it('skips when no route id is set', () => {
      const ctx = { $route: { params: {} }, activeGroupId: null, groupName: null }
      expect(apollo.skip.call(ctx)).toBe(true)
    })

    it('skips when store already has the matching group with a name', () => {
      const ctx = { $route: { params: { id: 'g1' } }, activeGroupId: 'g1', groupName: 'Yoga' }
      expect(apollo.skip.call(ctx)).toBe(true)
    })

    it('does not skip when activeGroupId mismatches', () => {
      const ctx = { $route: { params: { id: 'g1' } }, activeGroupId: 'g2', groupName: 'Yoga' }
      expect(apollo.skip.call(ctx)).toBe(false)
    })

    it('does not skip when groupName missing', () => {
      const ctx = { $route: { params: { id: 'g1' } }, activeGroupId: 'g1', groupName: null }
      expect(apollo.skip.call(ctx)).toBe(false)
    })

    it('writes group info to the store on result', () => {
      const setGroupInfo = jest.fn()
      apollo.result.call(
        { setGroupInfo },
        {
          data: {
            Group: [{ id: 'g1', name: 'Yoga', slug: 'yoga', avatar: { url: 'a' } }],
          },
        },
      )
      expect(setGroupInfo).toHaveBeenCalledWith({
        groupId: 'g1',
        groupName: 'Yoga',
        groupSlug: 'yoga',
        groupAvatar: { url: 'a' },
      })
    })

    it('ignores empty result payloads', () => {
      const setGroupInfo = jest.fn()
      apollo.result.call({ setGroupInfo }, { data: null })
      apollo.result.call({ setGroupInfo }, { data: { Group: [] } })
      expect(setGroupInfo).not.toHaveBeenCalled()
    })
  })
})
