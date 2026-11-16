import { FIXED_NETWORK_ROLES, networkRoleLabel } from './networkRoles'

const translate = (key) => `t:${key}`

describe('networkRoleLabel', () => {
  it('translates the roles whose name is fixed', () => {
    expect(FIXED_NETWORK_ROLES).toEqual(['owner', 'user'])
    expect(networkRoleLabel('owner', translate)).toBe('t:networkRoles.owner')
    expect(networkRoleLabel('user', translate)).toBe('t:networkRoles.user')
  })

  // A default role can be renamed, deleted or made anew under the same name: translated by name,
  // a role somebody made and called `admin` would read as the default one.
  it('shows every other role as its name, the default ones included', () => {
    expect(networkRoleLabel('admin', translate)).toBe('admin')
    expect(networkRoleLabel('badge-setter', translate)).toBe('badge-setter')
  })

  it('formats only a name it does not translate', () => {
    const format = (value) => value.toUpperCase()

    expect(networkRoleLabel('moderator', translate, format)).toBe('MODERATOR')
    expect(networkRoleLabel('owner', translate, format)).toBe('t:networkRoles.owner')
  })
})
