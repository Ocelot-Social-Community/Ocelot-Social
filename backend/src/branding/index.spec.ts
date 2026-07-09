import branding, { brandingDefaults } from '@src/branding'

// Integration check that the backend resolves the shared @ocelot-social/branding package
// correctly (esModuleInterop default import + named export). The deep-merge / override-wins
// behaviour is the package's own concern.
describe('branding (shared package)', () => {
  it('re-exports the resolved config, which equals the defaults for an empty override slot', () => {
    expect(branding).toEqual(brandingDefaults)
  })

  it('exposes the migrated backend domains with their default values', () => {
    expect(branding.group.descriptionMinLength).toBe(3)
    expect(branding.group.descriptionExcerptLength).toBe(250)
    expect(branding.registration.nonceLength).toBe(5)
    expect(branding.registration.inviteCodeLength).toBe(6)
    expect(branding.metadata.applicationName).toBe('ocelot.social')
    expect(branding.metadata.organizationName).toBe('ocelot.social Community')
    expect(branding.logos.welcomePath).toBe('/img/custom/logo-squared.svg')
  })
})
