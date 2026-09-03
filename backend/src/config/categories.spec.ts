import { describe, it, expect } from 'vitest'

import { ENV_CATEGORIES, categoryRank } from './categories'

describe('eNV_CATEGORIES', () => {
  it('has no duplicate categories', () => {
    expect(new Set(ENV_CATEGORIES).size).toBe(ENV_CATEGORIES.length)
  })

  it('orders the feature-policy categories the policy tab shows as registration → features → layout → video', () => {
    // The policy tab renders exactly this subset; its relative order is the global order's
    // responsibility, so pin it here (a reorder that breaks the policy tab fails loudly).
    const featureOrder = ENV_CATEGORIES.filter((category) =>
      ['registration', 'features', 'layout', 'video'].includes(category),
    )

    expect(featureOrder).toEqual(['registration', 'features', 'layout', 'video'])
  })
})

describe(categoryRank, () => {
  it('is the category index in the global display order', () => {
    expect(categoryRank('server')).toBe(0)
    expect(categoryRank(ENV_CATEGORIES[ENV_CATEGORIES.length - 1])).toBe(ENV_CATEGORIES.length - 1)
  })

  it('ranks earlier categories below later ones (drives the stable sort)', () => {
    expect(categoryRank('database')).toBeLessThan(categoryRank('registration'))
    expect(categoryRank('layout')).toBeLessThan(categoryRank('video'))
  })

  it('sorts an unknown category last, so a row is appended rather than dropped', () => {
    expect(categoryRank('totallyUnknown')).toBe(ENV_CATEGORIES.length)
    expect(categoryRank('totallyUnknown')).toBeGreaterThan(categoryRank('general'))
  })
})
