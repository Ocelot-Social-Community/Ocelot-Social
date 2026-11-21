import { findLibraryComponent } from './libraryComponent'

// A host element as vue-advanced-chat's custom element has it: its Vue 3 instance, and below it
// a tree of components and elements.
const hostOf = (room) => ({
  _instance: {
    subTree: {
      component: {
        type: { name: 'ChatContainer' },
        subTree: {
          children: [
            'text',
            null,
            { children: [{ component: { type: { name: 'RoomsList' }, subTree: null } }] },
            { component: room },
          ],
        },
      },
    },
  },
})
const room = (overrides = {}) => ({
  type: { name: 'ChatRoom' },
  isUnmounted: false,
  proxy: { scrollMessagesCount: 0 },
  subTree: null,
  ...overrides,
})

describe('findLibraryComponent', () => {
  it('finds the component of that name below the host', () => {
    const chatRoom = room()

    expect(findLibraryComponent(hostOf(chatRoom), 'ChatRoom')).toBe(chatRoom)
  })

  it('is null without a host, its Vue instance, or a component of that name', () => {
    expect(findLibraryComponent(null, 'ChatRoom')).toBeNull()
    expect(findLibraryComponent({}, 'ChatRoom')).toBeNull()
    expect(findLibraryComponent(hostOf(room()), 'RoomFooter')).toBeNull()
  })

  it('is null for one taken down, or without its proxy', () => {
    expect(findLibraryComponent(hostOf(room({ isUnmounted: true })), 'ChatRoom')).toBeNull()
    expect(findLibraryComponent(hostOf(room({ proxy: null })), 'ChatRoom')).toBeNull()
  })
})
