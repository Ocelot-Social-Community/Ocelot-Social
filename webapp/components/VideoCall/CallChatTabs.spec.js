import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import CallChatTabs from './CallChatTabs.vue'

const localVue = global.localVue

const stubs = {
  OsToggleGroup: {
    name: 'OsToggleGroup',
    props: ['options', 'value', 'label'],
    template: '<div class="stub-toggle-group" />',
  },
}

describe('CallChatTabs', () => {
  let openChat

  const Wrapper = (state = {}) => {
    openChat = jest.fn()
    const store = new Vuex.Store({
      getters: {
        'videoCall/groupId': () => 'g1',
        'videoCall/chatRoomId': () => ('chatRoomId' in state ? state.chatRoomId : 'room-1'),
        'videoCall/conferenceUnread': () => state.unread ?? 0,
        'chat/showChat': () =>
          state.chat ?? { showChat: true, chatUserId: null, groupId: null, roomId: 'room-1' },
      },
      mutations: { 'chat/SET_OPEN_CHAT': openChat },
    })
    return mount(CallChatTabs, {
      localVue,
      store,
      stubs,
      mocks: { $t: (key) => key },
    })
  }

  const group = (wrapper) => wrapper.findComponent({ name: 'OsToggleGroup' })

  it('offers the conference chat and the chat of the group, each with its hint', () => {
    expect(group(Wrapper()).props('options')).toEqual([
      {
        value: 'call',
        label: 'videoCall.chatTabs.call',
        title: 'videoCall.chatTabs.callHint',
      },
      {
        value: 'group',
        label: 'videoCall.chatTabs.group',
        title: 'videoCall.chatTabs.groupHint',
      },
    ])
  })

  it('marks the chat that is open', () => {
    expect(group(Wrapper()).props('value')).toBe('call')
    expect(
      group(Wrapper({ chat: { showChat: true, groupId: 'g1', roomId: null } })).props('value'),
    ).toBe('group')
  })

  it('shows the unread messages of the conference chat on its tab', () => {
    const [callTab, groupTab] = group(Wrapper({ unread: 3 })).props('options')
    expect(callTab.label).toBe('videoCall.chatTabs.call (3)')
    expect(groupTab.label).toBe('videoCall.chatTabs.group')
  })

  it('opens the chat of the group when its tab is picked', () => {
    const wrapper = Wrapper()
    group(wrapper).vm.$emit('select', 'group')
    expect(openChat.mock.calls[0][1]).toEqual({ showChat: true, chatUserId: null, groupId: 'g1' })
  })

  it('opens the conference chat when its tab is picked', () => {
    const wrapper = Wrapper({ chat: { showChat: true, groupId: 'g1', roomId: null } })
    group(wrapper).vm.$emit('select', 'call')
    expect(openChat.mock.calls[0][1]).toEqual({
      showChat: true,
      chatUserId: null,
      groupId: null,
      roomId: 'room-1',
    })
  })
})
