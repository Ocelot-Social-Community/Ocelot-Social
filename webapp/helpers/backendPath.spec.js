import { backendPath } from './backendPath'

describe('backendPath', () => {
  it('proxies a framework badge icon to the backend', () => {
    expect(backendPath('/img/badges/trophy_bear.svg')).toBe('/api/img/badges/trophy_bear.svg')
  })

  it('adds the missing slash for a relative path', () => {
    expect(backendPath('img/badges/trophy_bear.svg')).toBe('/api/img/badges/trophy_bear.svg')
  })

  it('passes a brand asset through — it is served from the archive, not by the backend', () => {
    expect(backendPath('/branding/acme/assets/badges/association_apt.svg')).toBe(
      '/branding/acme/assets/badges/association_apt.svg',
    )
  })

  it('does not mistake a backend path that merely mentions branding for a brand asset', () => {
    expect(backendPath('/img/branding/logo.svg')).toBe('/api/img/branding/logo.svg')
  })
})
