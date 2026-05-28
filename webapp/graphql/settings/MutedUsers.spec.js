import { mutedUsers, muteUser, unmuteUser } from './MutedUsers.js'

const printOp = (doc) => doc.loc.source.body.replace(/\s+/g, ' ').trim()

describe('graphql/settings/MutedUsers', () => {
  it('builds the mutedUsers query and inlines imageUrls fragment', () => {
    const op = printOp(mutedUsers())
    expect(op).toContain('mutedUsers {')
    expect(op).toContain('avatar { ...imageUrls }')
    expect(op).toContain('fragment imageUrls')
  })

  it('builds the muteUser mutation', () => {
    const op = printOp(muteUser())
    expect(op).toContain('muteUser(id: $id)')
    expect(op).toContain('isMuted')
  })

  it('builds the unmuteUser mutation', () => {
    const op = printOp(unmuteUser())
    expect(op).toContain('unmuteUser(id: $id)')
    expect(op).toContain('isMuted')
  })
})
