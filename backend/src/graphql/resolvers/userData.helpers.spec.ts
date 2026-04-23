import { byCreationDate } from './userData'

describe('byCreationDate', () => {
  it('returns -1 when a was created before b', () => {
    expect(byCreationDate({ createdAt: '2024-01-01' }, { createdAt: '2024-02-01' })).toBe(-1)
  })

  it('returns 1 when a was created after b', () => {
    expect(byCreationDate({ createdAt: '2024-02-01' }, { createdAt: '2024-01-01' })).toBe(1)
  })

  it('returns 0 when a and b were created at the same time', () => {
    expect(byCreationDate({ createdAt: '2024-01-01' }, { createdAt: '2024-01-01' })).toBe(0)
  })

  it('sorts an array of objects by createdAt ascending', () => {
    const items = [
      { id: 'c', createdAt: '2024-03-01' },
      { id: 'a', createdAt: '2024-01-01' },
      { id: 'b', createdAt: '2024-02-01' },
    ]
    items.sort(byCreationDate)
    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })
})
