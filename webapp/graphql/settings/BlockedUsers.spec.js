import { blockedUsers, blockUser, unblockUser } from './BlockedUsers.js'

const printOp = (doc) => doc.loc.source.body.replace(/\s+/g, ' ').trim()

describe('graphql/settings/BlockedUsers', () => {
  it('builds the blockedUsers query and inlines imageUrls fragment', () => {
    const op = printOp(blockedUsers())
    expect(op).toContain('blockedUsers {')
    expect(op).toContain('avatar { ...imageUrls }')
    expect(op).toContain('fragment imageUrls')
  })

  it('builds the blockUser mutation', () => {
    const op = printOp(blockUser())
    expect(op).toContain('blockUser(id: $id)')
    expect(op).toContain('blocked')
    expect(op).toContain('followedByCurrentUser')
  })

  it('builds the unblockUser mutation', () => {
    const op = printOp(unblockUser())
    expect(op).toContain('unblockUser(id: $id)')
    expect(op).toContain('blocked')
  })
})
