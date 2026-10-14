import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import Vue from 'vue'
import Vuex from 'vuex'
import Chat from './Chat.vue'

// Chat.vue reaches into the markup of vue-advanced-chat in several places, where the library
// offers no way in: it adds styles to the library's shadow DOM, hangs the hint above the
// messages into the library's message column, focuses its text field and watches its message
// list. None of that is part of the library's API, so an update of the library can break it
// without a word. Chat.spec.js cannot notice: it replaces the library with a stub.
//
// This spec renders the REAL library, in the browser emulation the other specs run in, and
// checks that everything Chat.vue looks for is still there — and that the hint does land in
// the message column. When a library update moves any of it, this fails first, naming what is
// gone. What it cannot check is how things look: the emulation applies no styles inside a
// shadow DOM.

const localVue = global.localVue

// What the library touches on load and the emulation does not have.
const browserParts = () => {
  window.AudioContext = class {
    createMediaStreamSource() {
      return { connect() {} }
    }

    createScriptProcessor() {
      return { connect() {} }
    }
  }
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = global.IntersectionObserver
  HTMLCanvasElement.prototype.getContext = () => null
  Element.prototype.scrollTo = function () {}
  global.indexedDB = { open: () => ({}) }
}

const room = {
  id: 'room-1',
  roomId: 'room-1',
  roomName: 'Yoga',
  avatar: null,
  isGroupRoom: false,
  isCallRoom: true,
  isWritable: true,
  createdAt: '2026-01-01T00:00:00Z',
  lastMessageAt: '2026-01-01T00:00:00Z',
  unreadCount: 0,
  group: { id: 'g1', slug: 'yoga', name: 'Yoga', avatar: null },
  lastMessage: null,
  users: [
    { _id: 'me', id: 'me', slug: 'me', name: 'Me', avatar: null },
    { _id: 'anna', id: 'anna', slug: 'anna', name: 'Anna', avatar: null },
  ],
}
const message = {
  _id: 'message-1',
  id: 'message-1',
  indexId: 0,
  content: 'Hello',
  senderId: 'anna',
  username: 'Anna',
  avatar: null,
  date: '2026-01-01T00:00:00Z',
  saved: true,
  distributed: true,
  seen: true,
  files: [],
  room: { id: 'room-1' },
}

describe('Chat.vue on the real vue-advanced-chat', () => {
  let ignoredElements
  let wrapper

  beforeAll(() => {
    browserParts()
    require('vue-advanced-chat').register()
    // Left to the browser as a custom element, as nuxt.config.js has it.
    ignoredElements = Vue.config.ignoredElements
    Vue.config.ignoredElements = ['vue-advanced-chat', 'emoji-picker']
  })

  afterAll(() => {
    Vue.config.ignoredElements = ignoredElements
  })

  afterEach(() => {
    if (wrapper && !wrapper.vm._isDestroyed) wrapper.destroy()
    wrapper = null
    document.body.innerHTML = ''
  })

  const mountChat = async (propsData = {}) => {
    const store = new Vuex.Store({
      modules: {
        auth: { namespaced: true, getters: { user: () => ({ id: 'me', name: 'Me' }) } },
        chat: {
          namespaced: true,
          state: { dismissedHints: [] },
          getters: { dismissedHints: (state) => state.dismissedHints },
          mutations: {
            UPDATE_ROOM_COUNT() {},
            DISMISS_HINT(state, key) {
              state.dismissedHints = [...state.dismissedHints, key]
            },
          },
        },
        videoCall: {
          namespaced: true,
          getters: { showVideoCall: () => false, minimized: () => false },
        },
      },
    })
    const query = jest.fn(({ variables }) =>
      Promise.resolve({ data: variables.roomId ? { Message: [message] } : { Room: [room] } }),
    )
    wrapper = mount(Chat, {
      localVue,
      store,
      attachTo: document.body,
      // Only the app's own pieces are stubbed; the library is not.
      stubs: {
        'nuxt-link': { template: '<a><slot /></a>' },
        'avatar-image': { template: '<span />' },
      },
      propsData: { singleRoom: true, roomId: 'room-1', ...propsData },
      mocks: {
        $t: (key) => key,
        $i18n: { locale: () => 'en' },
        $toast: { error: jest.fn() },
        $apollo: {
          query,
          mutate: jest.fn().mockResolvedValue({ data: {} }),
          subscribe: () => ({ subscribe: () => ({ unsubscribe() {} }) }),
        },
      },
    })
    // The library renders, asks for the room's messages, and renders them.
    for (let round = 0; round < 3; round++) {
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    return wrapper.vm.$el.shadowRoot
  }

  it('is the library element itself, with a shadow DOM to reach into', async () => {
    const shadowRoot = await mountChat()
    expect(wrapper.vm.$el.tagName.toLowerCase()).toBe('vue-advanced-chat')
    expect(shadowRoot).not.toBeNull()
  })

  describe('finds what it relies on', () => {
    it.each([
      ['the message column the hint is hung into', '.vac-col-messages'],
      ['the room header that hideHeader takes out', '.vac-room-header'],
      [
        'the scroll container hideHeader moves up and seen-tracking watches',
        '.vac-container-scroll',
      ],
      ['the text field it puts the cursor into', 'textarea#roomTextarea'],
      ['a message by the id unseen messages are found by', '[id="message-1"]'],
    ])('%s (%s)', async (_what, selector) => {
      const shadowRoot = await mountChat()
      expect(shadowRoot.querySelector(selector)).not.toBeNull()
    })
  })

  describe('hint above the messages', () => {
    const hint = 'Visible only to the participants\n(without notifications)'

    it('lands in the library message column', async () => {
      const shadowRoot = await mountChat({ hint, hintKey: 'call' })
      wrapper.vm.renderHint()
      const bubble = shadowRoot.querySelector('[data-test="chat-hint"]')
      expect(bubble).not.toBeNull()
      expect(bubble.parentElement.classList).toContain('vac-col-messages')
      expect(bubble.querySelector('.chat-hint__text').textContent).toBe(hint)
    })

    it('is placed by the styles added to the library', async () => {
      const shadowRoot = await mountChat({ hint, hintKey: 'call' })
      const styles = [...shadowRoot.querySelectorAll('style')].map((s) => s.textContent).join('')
      expect(styles).toContain('.chat-hint {')
    })

    it('goes away with its X', async () => {
      const shadowRoot = await mountChat({ hint, hintKey: 'call' })
      wrapper.vm.renderHint()
      shadowRoot.querySelector('[data-test="chat-hint-close"]').click()
      await wrapper.vm.$nextTick()
      expect(shadowRoot.querySelector('[data-test="chat-hint"]')).toBeNull()
    })
  })
})
