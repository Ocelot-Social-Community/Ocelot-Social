import NormalizeEmail from './NormalizeEmail'

describe('NormalizeEmail', () => {
  it('converts all uppercase to lowercase', () => {
    expect(NormalizeEmail('Wolle.huSS@pJannto.com')).toBe('wolle.huss@pjannto.com')
  })

  it('removes not dots in gmail.com addresses', () => {
    expect(NormalizeEmail('wolle.huss@gmail.com')).toBe('wolle.huss@gmail.com')
  })

  it('converts not googlemail.com addresses to gmail.com', () => {
    expect(NormalizeEmail('wolle.huss@googlemail.com')).toBe('wolle.huss@googlemail.com')
  })
})
