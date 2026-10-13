import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import CallChatTabs from './CallChatTabs.vue'

const localVue = global.localVue

describe('CallChatTabs', () => {
  let openChat

  const Wrapper = (state = {}) => {
    openChat = jest.fn()
    const store = new Vuex.Store({
      getters: {
        'videoCall/groupId': () => 'g1',
        'videoCall/chatRoomId': () => ('chatRoomId' in state ? state.chatRoomId : 'room-1'),
        'videoCall/conferenceUnread': () => state.unread ?? 0,
        'videoCall/groupChatUnread': () => state.groupUnread ?? 0,
        'chat/showChat': () =>
          state.chat ?? { showChat: true, chatUserId: null, groupId: null, roomId: 'room-1' },
      },
      mutations: { 'chat/SET_OPEN_CHAT': openChat },
    })
    return mount(CallChatTabs, {
      localVue,
      store,
      mocks: { $t: (key) => key },
      attachTo: document.body,
    })
  }

  const groupChat = { showChat: true, chatUserId: null, groupId: 'g1', roomId: null }
  const tab = (wrapper, name) => wrapper.find(`[data-test="call-chat-tab-${name}"]`)
  const opened = () => openChat.mock.calls.map(([, payload]) => payload)

  let wrapper
  afterEach(() => {
    wrapper.destroy()
  })

  it('offers the conference chat and the chat of the group as tabs, each with its hint', () => {
    wrapper = Wrapper()
    expect(wrapper.attributes('role')).toBe('tablist')
    expect(wrapper.attributes('aria-label')).toBe('videoCall.chatTabs.label')
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.wrappers.map((t) => t.text())).toEqual([
      'videoCall.chatTabs.call',
      'videoCall.chatTabs.group',
    ])
    expect(tabs.wrappers.map((t) => t.attributes('title'))).toEqual([
      'videoCall.chatTabs.callHint',
      'videoCall.chatTabs.groupHint',
    ])
  })

  it('marks the chat that is open, and keeps only that tab in the tab order', () => {
    wrapper = Wrapper()
    expect(tab(wrapper, 'call').attributes('aria-selected')).toBe('true')
    expect(tab(wrapper, 'call').classes()).toContain('call-chat-tabs__tab--active')
    expect(tab(wrapper, 'call').attributes('tabindex')).toBe('0')
    expect(tab(wrapper, 'group').attributes('aria-selected')).toBe('false')
    expect(tab(wrapper, 'group').classes()).not.toContain('call-chat-tabs__tab--active')
    expect(tab(wrapper, 'group').attributes('tabindex')).toBe('-1')
  })

  it('marks the chat of the group when that is the one open', () => {
    wrapper = Wrapper({ chat: groupChat })
    expect(tab(wrapper, 'group').attributes('aria-selected')).toBe('true')
    expect(tab(wrapper, 'call').attributes('aria-selected')).toBe('false')
  })

  it('keeps the first tab reachable while neither chat is open', () => {
    wrapper = Wrapper({ chat: { showChat: false, chatUserId: null, groupId: null, roomId: null } })
    expect(tab(wrapper, 'call').attributes('tabindex')).toBe('0')
    expect(tab(wrapper, 'call').attributes('aria-selected')).toBe('false')
  })

  const count = (wrapper, name) => wrapper.find(`[data-test="call-chat-tab-count-${name}"]`)

  it('shows the unread messages of the conference chat as a count beside its label', () => {
    wrapper = Wrapper({ unread: 3 })
    expect(tab(wrapper, 'call').find('.call-chat-tabs__label').text()).toBe(
      'videoCall.chatTabs.call',
    )
    expect(count(wrapper, 'call').text()).toBe('3')
    expect(count(wrapper, 'group').exists()).toBe(false)
  })

  it('shows the unread messages of the chat of the group on the other tab', () => {
    wrapper = Wrapper({ unread: 3, groupUnread: 7 })
    expect(count(wrapper, 'call').text()).toBe('3')
    expect(count(wrapper, 'group').text()).toBe('7')
  })

  it('shows no count while there is nothing unread', () => {
    wrapper = Wrapper()
    expect(count(wrapper, 'call').exists()).toBe(false)
    expect(count(wrapper, 'group').exists()).toBe(false)
  })

  it('caps the count where it would no longer fit', () => {
    wrapper = Wrapper({ unread: 120 })
    expect(count(wrapper, 'call').text()).toBe('99+')
  })

  it('opens the chat of the group when its tab is clicked', async () => {
    wrapper = Wrapper()
    await tab(wrapper, 'group').trigger('click')
    expect(opened()).toEqual([{ showChat: true, chatUserId: null, groupId: 'g1' }])
  })

  it('opens the conference chat when its tab is clicked', async () => {
    wrapper = Wrapper({ chat: groupChat })
    await tab(wrapper, 'call').trigger('click')
    expect(opened()).toEqual([
      { showChat: true, chatUserId: null, groupId: null, roomId: 'room-1' },
    ])
  })

  it('moves to the neighbouring tab with the arrow keys, opens it and takes the focus along', async () => {
    wrapper = Wrapper()
    await tab(wrapper, 'call').trigger('keydown.right')
    expect(opened()).toEqual([{ showChat: true, chatUserId: null, groupId: 'g1' }])
    expect(document.activeElement).toBe(tab(wrapper, 'group').element)
  })

  it('wraps around at the ends', async () => {
    wrapper = Wrapper()
    await tab(wrapper, 'call').trigger('keydown.left')
    expect(opened()).toEqual([{ showChat: true, chatUserId: null, groupId: 'g1' }])

    wrapper.destroy()
    wrapper = Wrapper({ chat: groupChat })
    await tab(wrapper, 'group').trigger('keydown.right')
    expect(opened()).toEqual([
      { showChat: true, chatUserId: null, groupId: null, roomId: 'room-1' },
    ])
  })
})
