import { canInGroup, groupRoleLabel, isGroupApplicant, isGroupMember } from './groupRights'

describe('canInGroup', () => {
  it('answers from the rights the group carries', () => {
    const group = { myGroupPermissions: ['group.post.create', 'group.read'] }
    expect(canInGroup('group.post.create', group)).toBe(true)
    expect(canInGroup('group.settings.manage', group)).toBe(false)
  })

  it.each([undefined, null, {}, { myGroupPermissions: null }])(
    'says no for %s rather than assuming a yes',
    (group) => {
      // A group fetched without the field is a missing answer, not permission.
      expect(canInGroup('group.post.create', group)).toBe(false)
    },
  )
})

describe('isGroupMember', () => {
  it('counts a role that is not an application', () => {
    expect(isGroupMember({ myGroupRole: { name: 'usual' } })).toBe(true)
    expect(isGroupMember({ myGroupRole: { name: 'editors' } })).toBe(true)
  })

  it('does not count an applicant or a non-member', () => {
    expect(isGroupMember({ myGroupRole: { name: 'pending' } })).toBe(false)
    expect(isGroupMember({ myGroupRole: null })).toBe(false)
    expect(isGroupMember(undefined)).toBe(false)
  })
})

describe('isGroupApplicant', () => {
  it('is true only while waiting for approval', () => {
    expect(isGroupApplicant({ myGroupRole: { name: 'pending' } })).toBe(true)
    expect(isGroupApplicant({ myGroupRole: { name: 'usual' } })).toBe(false)
    expect(isGroupApplicant({})).toBe(false)
  })
})

describe('groupRoleLabel', () => {
  const translate = (key) => (key === 'group.roles.usual' ? 'Mitglied' : key)

  it('prefers the label the group chose', () => {
    expect(groupRoleLabel({ name: 'editors', label: 'Redaktion' }, translate)).toBe('Redaktion')
  })

  it('translates a seeded name when there is no label', () => {
    expect(groupRoleLabel({ name: 'usual', label: null }, translate)).toBe('Mitglied')
  })

  it('falls back to the key for a role the group invented and did not label', () => {
    // Translating it would render the i18n key itself, which is worse than the key.
    expect(groupRoleLabel({ name: 'editors', label: null }, translate)).toBe('editors')
  })

  it('renders nothing for no role', () => {
    expect(groupRoleLabel(null, translate)).toBe('')
    expect(groupRoleLabel(undefined, translate)).toBe('')
  })
})
