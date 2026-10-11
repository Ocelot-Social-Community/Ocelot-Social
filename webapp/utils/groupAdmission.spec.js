import { admissionOf, admissionRights, withAdmission } from '~/utils/groupAdmission'

describe('admissionOf', () => {
  it('is open where anybody may walk in', () => {
    expect(admissionOf(['group.read', 'group.join'])).toBe('open')
  })

  it('is onRequest where anybody may ask', () => {
    expect(admissionOf(['group.read', 'group.join.request'])).toBe('onRequest')
  })

  it('is closed where neither right is held', () => {
    expect(admissionOf(['group.read', 'group.content.read'])).toBe('closed')
  })

  it('reads a role with BOTH the way the resolver reads it', () => {
    // JoinGroup asks for `group.join` first when it decides where the membership lands, so a
    // label derived the other way round would call an open door a waiting room.
    expect(admissionOf(['group.join', 'group.join.request'])).toBe('open')
  })

  it('treats a missing list as closed rather than throwing', () => {
    expect(admissionOf(undefined)).toBe('closed')
  })
})

describe('withAdmission', () => {
  it('replaces the join rights rather than adding to them', () => {
    // Three states of one question: a list holding both would be two answers to it.
    expect(withAdmission(['group.read', 'group.join'], 'onRequest')).toEqual([
      'group.read',
      'group.join.request',
    ])
  })

  it('leaves every other right where it was', () => {
    expect(withAdmission(['group.read', 'group.content.read'], 'open')).toEqual([
      'group.read',
      'group.content.read',
      'group.join',
    ])
  })

  it('closes the door by taking both away', () => {
    expect(withAdmission(['group.read', 'group.join.request'], 'closed')).toEqual(['group.read'])
  })

  it('round-trips through admissionOf for every state', () => {
    for (const state of ['open', 'onRequest', 'closed']) {
      expect(admissionOf(withAdmission(['group.read'], state))).toBe(state)
    }
  })
})

describe('admissionRights', () => {
  it('names the one right each state means', () => {
    expect(admissionRights('open')).toEqual(['group.join'])
    expect(admissionRights('onRequest')).toEqual(['group.join.request'])
    expect(admissionRights('closed')).toEqual([])
  })
})
