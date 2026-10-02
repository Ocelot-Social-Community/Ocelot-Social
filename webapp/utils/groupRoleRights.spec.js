import { applyRightChange } from '~/utils/groupRoleRights'

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
