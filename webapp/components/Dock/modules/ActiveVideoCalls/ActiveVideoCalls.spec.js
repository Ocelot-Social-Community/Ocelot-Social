import { shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import ActiveVideoCalls from './ActiveVideoCalls.vue'

const localVue = global.localVue

const call = (id, participantCount = 1) => ({
  group: { id, slug: id, name: id, visibility: 'public', avatar: null },
  participantCount,
  participants: [],
})

describe('ActiveVideoCalls.vue', () => {
  const Wrapper = ({ calls = [], inCall = null } = {}) => {
    const store = new Vuex.Store({
      getters: {
        'videoCall/showVideoCall': () => !!inCall,
        'videoCall/groupId': () => inCall,
      },
    })
    const wrapper = shallowMount(ActiveVideoCalls, {
      localVue,
      store,
      mocks: { $t: (key) => key },
      data: () => ({ activeVideoCalls: calls }),
    })
    return wrapper
  }

  it('shows nothing while no call runs, and says so to the dock', () => {
    const wrapper = Wrapper()
    expect(wrapper.find('[data-test="active-video-calls"]').exists()).toBe(false)
    expect(wrapper.emitted('count')).toEqual([[0]])
  })

  it('reports every change of the number of calls to the dock', async () => {
    const wrapper = Wrapper()
    wrapper.setData({ activeVideoCalls: [call('a'), call('b')] })
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('count')).toEqual([[0], [2]])
  })

  it('lists the viewer’s own call first, then the busiest', () => {
    const wrapper = Wrapper({
      calls: [call('small', 1), call('big', 5), call('mine', 2)],
      inCall: 'mine',
    })
    const cards = wrapper.findAllComponents({ name: 'ActiveVideoCallCard' }).wrappers

    expect(cards.map((card) => card.props('call').group.id)).toEqual(['mine', 'big', 'small'])
    expect(cards.map((card) => card.props('joined'))).toEqual([true, false, false])
  })

  it('treats a group remembered from a closed call as not joined', () => {
    // groupId may outlive the call window; only an open call counts.
    const store = new Vuex.Store({
      getters: { 'videoCall/showVideoCall': () => false, 'videoCall/groupId': () => 'a' },
    })
    const wrapper = shallowMount(ActiveVideoCalls, {
      localVue,
      store,
      mocks: { $t: (key) => key },
      data: () => ({ activeVideoCalls: [call('a')] }),
    })
    expect(wrapper.findComponent({ name: 'ActiveVideoCallCard' }).props('joined')).toBe(false)
  })

  it('asks the dock to get out of the way once a call is joined', () => {
    const wrapper = Wrapper({ calls: [call('a')] })
    wrapper.findComponent({ name: 'ActiveVideoCallCard' }).vm.$emit('joined')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  describe('apollo', () => {
    const apollo = ActiveVideoCalls.apollo.activeVideoCalls
    const { updateQuery } = apollo.subscribeToMore
    const pushed = (groupId, pushedCall) => ({
      subscriptionData: { data: { activeVideoCallChanged: { groupId, call: pushedCall } } },
    })

    it('loads the calls fresh from the network', () => {
      expect(apollo.query()).toBeTruthy()
      expect(apollo.fetchPolicy).toBe('network-only')
      expect(apollo.subscribeToMore.document).toBeTruthy()
    })

    it('stays quiet in the UI when loading fails', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      apollo.error(new Error('down'))
      expect(warn).toHaveBeenCalledWith('activeVideoCalls query failed:', expect.any(Error))
      warn.mockRestore()
    })

    it('adds a call that started', () => {
      const result = updateQuery({ activeVideoCalls: [call('a')] }, pushed('b', call('b')))
      expect(result.activeVideoCalls.map(({ group }) => group.id)).toEqual(['a', 'b'])
    })

    it('replaces a call that changed', () => {
      const result = updateQuery({ activeVideoCalls: [call('a', 1)] }, pushed('a', call('a', 3)))
      expect(result.activeVideoCalls).toEqual([call('a', 3)])
    })

    it('drops a call that ended', () => {
      const result = updateQuery({ activeVideoCalls: [call('a'), call('b')] }, pushed('a', null))
      expect(result.activeVideoCalls.map(({ group }) => group.id)).toEqual(['b'])
    })

    it('waits for the list when a change comes in while it loads', () => {
      const vm = {}
      expect(updateQuery.call(vm, undefined, pushed('a', call('a')))).toBeUndefined()
      expect(vm.reloadAfterLoad).toBe(true)
    })

    it('asks again once loaded when a change came in while loading', () => {
      // The answer may predate the change; asking again gets one that includes it.
      const refetch = jest.fn()
      const vm = { reloadAfterLoad: true, $apollo: { queries: { activeVideoCalls: { refetch } } } }

      apollo.result.call(vm)
      apollo.result.call(vm)

      expect(refetch).toHaveBeenCalledTimes(1)
      expect(vm.reloadAfterLoad).toBe(false)
    })
  })
})
