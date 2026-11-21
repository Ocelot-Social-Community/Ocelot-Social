import { findLibraryComponent } from './libraryComponent'

// libraryComponent.js reaches into vue-advanced-chat, past its interface. This holds what the
// chat takes from there against the library as installed: should an update move it, this fails,
// before anybody notices in the browser that the count of unread messages below is gone.

const users = [
  { _id: 'me', username: 'Me' },
  { _id: 'other-user', username: 'Other' },
]

// What jsdom lacks and the library asks for on loading or mounting: an audio context for
// voice messages, a canvas to test emoji support with, and the browser database of its emoji
// picker — one that never answers, the emojis are of no concern here. And, once the messages
// are in: scrolling to the newest one, and watching what is in sight.
window.AudioContext = class {
  createMediaStreamSource() {
    return { connect() {} }
  }

  createScriptProcessor() {
    return { connect() {} }
  }
}
HTMLCanvasElement.prototype.getContext = () => null
window.indexedDB = { open: () => ({}) }
Element.prototype.scrollTo = () => {}
window.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const { register } = require('vue-advanced-chat')
register()

const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

let chat

beforeEach(async () => {
  chat = document.createElement('vue-advanced-chat')
  const attributes = {
    'current-user-id': 'me',
    'room-id': 'room-1',
    'rooms-loaded': 'true',
    'messages-loaded': 'true',
    rooms: JSON.stringify([{ roomId: 'room-1', roomName: 'One', users }]),
    messages: '[]',
    'show-emojis': 'false',
    'emojis-suggestion-enabled': 'false',
  }
  Object.entries(attributes).forEach(([name, value]) => chat.setAttribute(name, value))
  document.body.appendChild(chat)
  await settle()
  // The library draws its button only once messages come in for the room opened.
  const message = {
    _id: 'm1',
    content: 'Hello',
    senderId: 'other-user',
    username: 'Other',
    date: '1 Jan',
    timestamp: '10:00',
  }
  chat.setAttribute('messages', JSON.stringify([message]))
  await settle()
})

afterEach(() => {
  chat.remove()
})

describe('the room of vue-advanced-chat', () => {
  it('is found, with the count of its button to the newest message', () => {
    const room = findLibraryComponent(chat, 'ChatRoom')

    expect(room).not.toBeNull()
    expect(room.proxy.scrollMessagesCount).toBe(0)
    expect(room.proxy.scrollIcon).toBe(false)
  })

  it('shows the count given on that button', async () => {
    const room = findLibraryComponent(chat, 'ChatRoom')

    room.proxy.scrollMessagesCount = 4
    room.proxy.scrollIcon = true
    await settle()

    const count = chat.shadowRoot.querySelector('.vac-icon-scroll .vac-messages-count')

    expect(count.textContent).toBe('4')
  })
})
