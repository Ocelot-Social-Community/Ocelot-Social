import { muteGroup, unmuteGroup } from './MutedGroups.js'

const printOp = (doc) => doc.loc.source.body.replace(/\s+/g, ' ').trim()

describe('graphql/settings/MutedGroups', () => {
  it('builds the muteGroup mutation with isMutedByMe in the response', () => {
    const op = printOp(muteGroup())
    expect(op).toContain('muteGroup(groupId: $groupId)')
    expect(op).toContain('isMutedByMe')
  })

  it('builds the unmuteGroup mutation with isMutedByMe in the response', () => {
    const op = printOp(unmuteGroup())
    expect(op).toContain('unmuteGroup(groupId: $groupId)')
    expect(op).toContain('isMutedByMe')
  })
})
