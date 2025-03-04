import normalizeEmail from './normalizeEmail'

describe('normalizeEmail', () => {
  it('converts all uppercase to lowercase', () => {
    expect(normalizeEmail('Wolle.huSS@pJannto.com')).toBe('wolle.huss@pjannto.com')
  })

  it('removes not dots in gmail.com addresses', () => {
    expect(normalizeEmail('wolle.huss@gmail.com')).toBe('wolle.huss@gmail.com')
  })

  it('converts not googlemail.com addresses to gmail.com', () => {
    expect(normalizeEmail('wolle.huss@googlemail.com')).toBe('wolle.huss@googlemail.com')
  })
})
