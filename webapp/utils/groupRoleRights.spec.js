import { applyRightChange, mayAssignGroupRole, rightsTouchedBy } from '~/utils/groupRoleRights'

describe('applyRightChange', () => {
  it('adds the right that was ticked', () => {
    expect(applyRightChange(['group.read'], 'group.post.create', true)).toEqual([
      'group.read',
      'group.post.create',
    ])
  })

  it('drags in what the ticked right cannot be exercised without', () => {
    // Reading the posts of a group one may not even see is not a state the product has — and
    // without this, ticking it left the group reported as hidden.
    expect(applyRightChange([], 'group.content.read', true)).toEqual([
      'group.content.read',
      'group.read',
    ])
    expect(applyRightChange([], 'group.members.read', true)).toEqual([
      'group.members.read',
      'group.read',
    ])
  })

  it('takes the dependants with it when the right they need is removed', () => {
    // This half exists only in the client: the backend closes the implication on every write,
    // so without it `group.read` would come straight back and the untick would look inert.
    expect(
      applyRightChange(
        ['group.read', 'group.content.read', 'group.members.read'],
        'group.read',
        false,
      ),
    ).toEqual([])
  })

  it('removes only what was asked for when nothing depends on it', () => {
    expect(
      applyRightChange(['group.read', 'group.post.create'], 'group.post.create', false),
    ).toEqual(['group.read'])
  })

  it('leaves the right to see the group alone when a dependant is removed', () => {
    // Unticking "outsiders may read the posts" makes the group closed, not hidden.
    expect(
      applyRightChange(['group.read', 'group.content.read'], 'group.content.read', false),
    ).toEqual(['group.read'])
  })

  it('does not duplicate a right that is already held', () => {
    expect(applyRightChange(['group.read'], 'group.read', true)).toEqual(['group.read'])
  })
})

describe('mayAssignGroupRole', () => {
  const assign = 'group.member.role.assign'

  it('refuses somebody without the right at all', () => {
    expect(
      mayAssignGroupRole({
        viewerPermissions: ['group.read'],
        memberPermissions: [],
        rolePermissions: [],
      }),
    ).toBe(false)
  })

  it('refuses a role the viewer does not hold every right of', () => {
    // Otherwise handing out a role would be a way to climb: write the right into a role, then
    // put somebody in it and take it back.
    expect(
      mayAssignGroupRole({
        viewerPermissions: [assign, 'group.read'],
        memberPermissions: [],
        rolePermissions: ['group.settings.manage'],
      }),
    ).toBe(false)
  })

  it('refuses to reshape somebody who holds as much as the viewer', () => {
    // A moderator demoting an admin is the case this exists for; so is a peer demoting a peer.
    expect(
      mayAssignGroupRole({
        viewerPermissions: [assign, 'group.read'],
        memberPermissions: [assign, 'group.read'],
        rolePermissions: ['group.read'],
      }),
    ).toBe(false)
  })

  it('refuses to reshape somebody who holds MORE than the viewer', () => {
    expect(
      mayAssignGroupRole({
        viewerPermissions: [assign, 'group.read'],
        memberPermissions: [assign, 'group.read', 'group.settings.manage'],
        rolePermissions: ['group.read'],
      }),
    ).toBe(false)
  })

  it('allows it where the viewer outranks the member and covers the role', () => {
    expect(
      mayAssignGroupRole({
        viewerPermissions: [assign, 'group.read', 'group.settings.manage'],
        memberPermissions: ['group.read'],
        rolePermissions: ['group.read', 'group.settings.manage'],
      }),
    ).toBe(true)
  })
})

describe('rightsTouchedBy', () => {
  it('names the right itself where nothing else depends on it', () => {
    expect(rightsTouchedBy('group.post.create')).toEqual(['group.post.create'])
  })

  it('names what a right cannot be held without', () => {
    expect(rightsTouchedBy('group.content.read').sort()).toEqual([
      'group.content.read',
      'group.read',
    ])
  })

  it('names what would fall with it, too', () => {
    // The other direction of the same implication: unticking "outsiders see the group" takes
    // the two reading rights with it, so hovering it has to point at all three.
    expect(rightsTouchedBy('group.read').sort()).toEqual([
      'group.content.read',
      'group.members.read',
      'group.read',
    ])
  })

  it('answers the same whether the right is currently held or not', () => {
    // It describes the sentence, not the click. A set that changed with the tick would make the
    // connection appear and disappear under the cursor.
    expect(rightsTouchedBy('group.content.read')).toEqual(rightsTouchedBy('group.content.read'))
  })
})
