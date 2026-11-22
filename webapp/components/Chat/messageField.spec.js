import { findMessageField } from './messageField'

// A host element as vue-advanced-chat's custom element has it: its Vue 3 instance, and below it
// a tree of components and elements with the footer somewhere inside.
const footerComponent = (overrides = {}) => ({
  type: { name: 'RoomFooter' },
  isUnmounted: false,
  props: { roomId: 'room-1' },
  proxy: {
    message: 'Hi',
    files: ['a file'],
    selectedUsersTag: ['a user'],
    $watch: jest.fn(() => 'unwatch'),
  },
  ...overrides,
})
const hostOf = (footer) => ({
  _instance: {
    subTree: {
      component: {
        type: { name: 'ChatContainer' },
        subTree: {
          children: [
            'text',
            null,
            { children: [{ component: { type: { name: 'RoomsList' }, subTree: null } }] },
            {
              component: { type: { name: 'Room' }, subTree: { children: [{ component: footer }] } },
            },
          ],
        },
      },
    },
  },
})

describe('findMessageField', () => {
  it('finds the footer below the host, and reads and writes its state', () => {
    const footer = footerComponent()
    const field = findMessageField(hostOf(footer))

    expect(field.roomId).toBe('room-1')
    expect(field.message).toBe('Hi')
    expect(field.files).toEqual(['a file'])
    expect(field.mentioned).toEqual(['a user'])
    expect(field.isUnmounted).toBe(false)

    field.files = ['another file']
    field.mentioned = []

    expect(footer.proxy.files).toEqual(['another file'])
    expect(footer.proxy.selectedUsersTag).toEqual([])

    const callback = () => {}

    expect(field.watch('files', callback, { deep: true })).toBe('unwatch')
    expect(footer.proxy.$watch).toHaveBeenCalledWith('files', callback, { deep: true })
  })

  it('is null without a host, without its Vue instance, or without a footer', () => {
    expect(findMessageField(null)).toBeNull()
    expect(findMessageField({})).toBeNull()
    expect(findMessageField(hostOf({ type: { name: 'Other' }, subTree: null }))).toBeNull()
  })

  it('is null for a footer taken down', () => {
    expect(findMessageField(hostOf(footerComponent({ isUnmounted: true })))).toBeNull()
  })
})
