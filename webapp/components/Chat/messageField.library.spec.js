import { findMessageField } from './messageField'

// messageField.js reaches into vue-advanced-chat, past its interface. This holds it against the
// library as installed: should an update move its message field, this fails, before anybody
// notices in the browser that drafts keep their text only.

const users = [
  { _id: 'me', username: 'Me' },
  { _id: 'other-user', username: 'Other' },
]
const rooms = [
  { roomId: 'room-1', roomName: 'One', users },
  { roomId: 'room-2', roomName: 'Two', users },
]

// What jsdom lacks and the library asks for on loading or mounting: an audio context for
// voice messages, a canvas to test emoji support with, and the browser database of its emoji
// picker — one that never answers, the emojis are of no concern here.
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
    rooms: JSON.stringify(rooms),
    messages: '[]',
    'show-emojis': 'false',
    'emojis-suggestion-enabled': 'false',
  }
  Object.entries(attributes).forEach(([name, value]) => chat.setAttribute(name, value))
  document.body.appendChild(chat)
  await settle()
})

afterEach(() => {
  chat.remove()
})

describe('the message field of vue-advanced-chat', () => {
  it('is found, showing the room open', () => {
    const field = findMessageField(chat)

    expect(field).not.toBeNull()
    expect(field.roomId).toBe('room-1')
    expect(field.message).toBe('')
    expect(field.files).toEqual([])
    expect(field.mentioned).toEqual([])
  })

  it('tells of a mention picked from its list, written in without typing', async () => {
    const field = findMessageField(chat)
    const seen = []
    field.watch(
      () => [field.message, field.mentioned.length],
      () => seen.push([field.message, field.mentioned.map((user) => user._id)]),
    )
    const textarea = chat.shadowRoot.querySelector('textarea')
    textarea.value = '@Ot'
    textarea.setSelectionRange(3, 3)
    textarea.dispatchEvent(new Event('input'))
    // The library opens its list of people once the key is let go, 60ms later.
    textarea.dispatchEvent(new KeyboardEvent('keyup', { key: 't' }))
    await new Promise((resolve) => setTimeout(resolve, 100))
    await settle()

    chat.shadowRoot.querySelector('.vac-tags-box').click()
    await settle()

    expect(field.message).toBe('@Other ')
    expect(field.mentioned).toEqual([expect.objectContaining({ _id: 'other-user' })])
    expect(seen[seen.length - 1]).toEqual(['@Other ', ['other-user']])
  })

  it('follows the room opened, emptied for it', async () => {
    const field = findMessageField(chat)
    field.files = [{ name: 'notes', extension: 'txt', type: 'text/plain', localUrl: 'u1' }]
    field.mentioned = [users[1]]

    chat.setAttribute('room-id', 'room-2')
    await settle()

    expect(field.roomId).toBe('room-2')
    expect(field.files).toEqual([])
    expect(field.mentioned).toEqual([])
  })

  it('shows the files put into it, and tells of changes to them', async () => {
    const field = findMessageField(chat)
    const seen = []
    field.watch('files', (files) => seen.push(files.map((file) => file.name)), { deep: true })

    field.files = [{ name: 'notes', extension: 'txt', type: 'text/plain', localUrl: 'u1' }]
    await settle()

    expect(chat.shadowRoot.querySelectorAll('.vac-room-file-container')).toHaveLength(1)

    field.files[0].draftUrl = 'u1'
    field.files = []
    await settle()

    expect(seen).toEqual([['notes'], []])
  })

  it('sends the files put into it, and the people put into it as mentioned by tag', async () => {
    const sent = []
    chat.addEventListener('send-message', (event) => sent.push(event.detail[0]))
    chat.setAttribute('room-message', 'Hi @Other')
    await settle()
    const field = findMessageField(chat)
    field.mentioned = [users[1]]
    field.files = [
      { name: 'notes', extension: 'txt', type: 'text/plain', localUrl: 'u1', draftUrl: 'u1' },
    ]
    await settle()

    chat.shadowRoot.querySelector('#vac-icon-send').closest('.vac-svg-button').click()
    await settle()

    expect(sent).toEqual([
      expect.objectContaining({
        roomId: 'room-1',
        content: 'Hi <usertag>other-user</usertag>',
        files: [expect.objectContaining({ name: 'notes', draftUrl: 'u1' })],
      }),
    ])
    expect(field.files).toEqual([])
  })
})
