import { privacyLevelOf } from './groupPrivacyLevel'

describe('privacyLevelOf', () => {
  it('reads an unreadable profile as hidden', () => {
    expect(privacyLevelOf([])).toBe('hidden')
    expect(privacyLevelOf(null)).toBe('hidden')
    expect(privacyLevelOf(['group.content.read', 'group.members.read'])).toBe('hidden')
  })

  it('reads a readable profile with private content as closed', () => {
    expect(privacyLevelOf(['group.read', 'group.join.request'])).toBe('closed')
  })

  it('reads both as public', () => {
    expect(privacyLevelOf(['group.read', 'group.content.read'])).toBe('public')
  })

  it('ignores the member list and the door', () => {
    // "Public, but the member list stays private" and "public, but joining needs approval" are
    // both still public: what makes a group public is what outsiders may READ.
    expect(privacyLevelOf(['group.read', 'group.content.read', 'group.join.request'])).toBe(
      'public',
    )
    expect(privacyLevelOf(['group.read', 'group.content.read', 'group.members.read'])).toBe(
      'public',
    )
  })
})
