import branding, { brandingDefaults } from '@src/branding'

describe('branding', () => {
  it('resolves to the framework defaults when the override slot is empty (vanilla)', () => {
    // overrides.ts ships `{}` → the resolved config equals the defaults.
    expect(branding).toEqual(brandingDefaults)
  })

  it('exposes the migrated group constants', () => {
    expect(branding.group.descriptionMinLength).toBe(3)
    expect(branding.group.descriptionExcerptLength).toBe(250)
  })

  it('does not mutate the defaults while resolving', () => {
    // merge() targets a fresh object, so the canonical defaults stay pristine.
    expect(brandingDefaults.group).toEqual({
      descriptionMinLength: 3,
      descriptionExcerptLength: 250,
    })
  })

  it('lets a sparse brand override win over the default via deep merge', () => {
    jest.isolateModules(() => {
      jest.doMock('./overrides', () => ({
        __esModule: true,
        default: { group: { descriptionMinLength: 10 } },
      }))
      // eslint-disable-next-line @typescript-eslint/no-require-imports, n/global-require
      const merged = (require('./index') as { default: typeof branding }).default
      // overridden key wins…
      expect(merged.group.descriptionMinLength).toBe(10)
      // …while the untouched key keeps its default (deep, not shallow, merge).
      expect(merged.group.descriptionExcerptLength).toBe(250)
    })
    jest.dontMock('./overrides')
  })
})
