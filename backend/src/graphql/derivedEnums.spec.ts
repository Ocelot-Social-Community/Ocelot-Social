import { ENV_CATEGORIES } from '@src/config/categories'
import { allKeys } from '@src/policy/schema'

import { derivedEnumSDLs, envCategoryEnumSDL, policyKeyEnumSDL } from './derivedEnums'

// The runtime schema (types/index.ts) and the graphql-eslint static schema (eslint.config.ts)
// both consume these, so pin the SDL to the canonical sources — allKeys() proves the raw
// Object.keys(properties) construction here matches the app's key accessor.
describe('derivedEnumSDLs', () => {
  it('builds the PolicyKey enum from every policy key, matching allKeys()', () => {
    expect(policyKeyEnumSDL).toBe(`enum PolicyKey { ${allKeys().join(' ')} }`)
  })

  it('builds the EnvCategory enum from the shared category vocabulary, in order', () => {
    expect(envCategoryEnumSDL).toBe(`enum EnvCategory { ${ENV_CATEGORIES.join(' ')} }`)
  })

  it('exposes both derived enums for spreading into a schema source list', () => {
    expect(derivedEnumSDLs).toEqual([policyKeyEnumSDL, envCategoryEnumSDL])
  })
})
