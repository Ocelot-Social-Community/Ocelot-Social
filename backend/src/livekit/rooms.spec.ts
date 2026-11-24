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

const {
  clientKeyOf,
  groupIdFromRoomName,
  identityFor,
  issuedAtOf,
  joinSuffix,
  roomNameForGroup,
  roomPrefix,
} = await import('./rooms')

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

describe('the identity of a connection', () => {
  it("carries the tab's id between the user and the suffix", () => {
    expect(identityFor('ute', 'tab-aaaa1', 'ab12')).toBe('ute#tab-aaaa1#ab12')
    expect(clientKeyOf('ute#tab-aaaa1#ab12')).toBe('ute#tab-aaaa1')
  })

  it('leaves out a missing or malformed tab id, and then knows no tab', () => {
    for (const clientId of [
      undefined,
      null,
      '',
      'short',
      'with#hash1',
      'with space',
      'x'.repeat(65),
    ]) {
      expect(identityFor('ute', clientId, 'ab12')).toBe('ute#ab12')
    }

    expect(clientKeyOf('ute#ab12')).toBeNull()
    expect(clientKeyOf('ute')).toBeNull()
    expect(clientKeyOf('ute#tab-aaaa1#ab12#more')).toBeNull()
    expect(clientKeyOf('#tab-aaaa1#ab12')).toBeNull()
  })
})

describe('joinSuffix', () => {
  it('says when its token was issued, readable again from the identity', () => {
    const suffix = joinSuffix(1_700_000_000_123)

    expect(suffix).toMatch(/^[0-9a-z]+-[0-9a-f]{8}$/)
    expect(issuedAtOf(identityFor('ute', 'tab-aaaa1', suffix))).toBe(1_700_000_000_123)
  })

  it('differs for two tokens issued in the same millisecond', () => {
    expect(joinSuffix(1)).not.toBe(joinSuffix(1))
  })

  it('tells nothing for an identity that does not say when', () => {
    expect(issuedAtOf('ute#tab-aaaa1#ab12')).toBeNull()
    expect(issuedAtOf('ute#ab12')).toBeNull()
    expect(issuedAtOf('ute#lkx1-ab12')).toBeNull()
  })
})
