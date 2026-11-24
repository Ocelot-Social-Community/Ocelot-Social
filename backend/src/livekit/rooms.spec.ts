import { describe, expect, it } from 'vitest'

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: { LIVEKIT_ROOM_PREFIX: undefined as string | undefined },
}))

vi.mock('@config/index', () => ({
  __esModule: true,
  get default() {
    return mockConfig
  },
}))

const { groupIdFromRoomName, peopleIn, roomNameForGroup, roomPrefix } = await import('./rooms')

describe('the names of the rooms', () => {
  it('are group-<id> without a prefix of the instance', () => {
    mockConfig.LIVEKIT_ROOM_PREFIX = undefined

    expect(roomNameForGroup('g1')).toBe('group-g1')
    expect(groupIdFromRoomName('group-g1')).toBe('g1')

    mockConfig.LIVEKIT_ROOM_PREFIX = ''

    expect(roomPrefix()).toBe('group-')
  })

  it("carry the instance's prefix, and know no room of another instance", () => {
    mockConfig.LIVEKIT_ROOM_PREFIX = 'local-anna-'

    expect(roomNameForGroup('g1')).toBe('local-anna-group-g1')
    expect(groupIdFromRoomName('local-anna-group-g1')).toBe('g1')
    // Another instance's room of the same group id, with no prefix or another one: not ours.
    expect(groupIdFromRoomName('group-g1')).toBeNull()
    expect(groupIdFromRoomName('stage-group-g1')).toBeNull()
  })

  it('know no group in a name without an id, nor in no name at all', () => {
    mockConfig.LIVEKIT_ROOM_PREFIX = ''

    expect(groupIdFromRoomName('group-')).toBeNull()
    expect(groupIdFromRoomName(null)).toBeNull()
    expect(groupIdFromRoomName(undefined)).toBeNull()
  })
})

describe('peopleIn', () => {
  it('counts a user on several tabs or devices once', () => {
    expect(
      peopleIn([
        { identity: 'peter#1', metadata: '{"userId":"peter"}' },
        { identity: 'peter#2', metadata: '{"userId":"peter"}' },
        { identity: 'udo#3' },
      ]),
    ).toBe(2)
  })

  it('counts a connection nobody can be told behind on its own, so a call is never empty', () => {
    expect(peopleIn([{ identity: '' }, { identity: '' }])).toBe(2)
    expect(peopleIn([])).toBe(0)
  })
})
