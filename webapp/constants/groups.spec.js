import { isMootRight, mootReasonFor } from './groups'

describe('isMootRight', () => {
  it('greys the chat on the non-member role, whose holder has no way into the room', () => {
    expect(isMootRight('none', 'group.chat.read')).toBe(true)
    expect(isMootRight('none', 'group.chat.write')).toBe(true)
  })

  it('leaves the chat to every role that is a membership, applicants included', () => {
    expect(isMootRight('usual', 'group.chat.read')).toBe(false)
    expect(isMootRight('pending', 'group.chat.read')).toBe(false)
  })
})

describe('mootReasonFor', () => {
  it('names the reason that applies, one per case', () => {
    expect(mootReasonFor('none', 'group.chat.write')).toBe('group.rights.mootChat')
    expect(mootReasonFor('none', 'group.leave')).toBe('group.rights.mootLeave')
    expect(mootReasonFor('usual', 'group.join')).toBe('group.rights.mootJoin')
  })

  it('has none for a right that applies', () => {
    expect(mootReasonFor('usual', 'group.chat.write')).toBeNull()
  })
})
