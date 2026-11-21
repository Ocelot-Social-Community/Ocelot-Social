import { describe, afterEach, it, expect } from 'vitest'

import { branding, brandingDefaults, setBranding, getBranding } from '@src/branding'

// Integration check that the backend resolves the shared @ocelot-social/branding package
// correctly (esModuleInterop default import + named export) and its RUNTIME accessor.
describe('branding (shared package)', () => {
  afterEach(() => {
    setBranding(undefined) // reset any injected config
  })

  it('re-exports the resolved config, which equals the defaults for an empty override slot', () => {
    // Vanilla offers both colour schemes; a brand has only the one it declares (default light).
    expect(branding).toEqual({
      ...brandingDefaults,
      theme: { ...brandingDefaults.theme, colorScheme: 'light dark' },
    })
  })

  it('exposes the migrated backend domains with their default values', () => {
    expect(branding.group.descriptionMinLength).toBe(3)
    expect(branding.registration.nonceLength).toBe(5)
    expect(branding.registration.inviteCodeLength).toBe(6)
    expect(branding.metadata.applicationName).toBe('ocelot.social')
    expect(branding.metadata.organizationName).toBe('ocelot.social Community')
    expect(branding.logos.welcomePath).toBe('/img/custom/logo-squared.svg')
  })

  it('resolves an injected brand config at RUNTIME (setBranding) and resets', () => {
    // A value read AFTER injection reflects the brand config — this is what lets a pre-built
    // image be branded without a rebuild.
    const brand = {
      ...brandingDefaults,
      group: { ...brandingDefaults.group, nameLengthMax: 99 },
      metadata: { ...brandingDefaults.metadata, applicationName: 'MyNet' },
    }
    setBranding(brand)

    expect(branding.group.nameLengthMax).toBe(99)
    expect(branding.metadata.applicationName).toBe('MyNet')
    expect(getBranding().group.nameLengthMax).toBe(99)

    setBranding(undefined)

    expect(branding.group.nameLengthMax).toBe(brandingDefaults.group.nameLengthMax)
    expect(branding.metadata.applicationName).toBe('ocelot.social')
  })
})
