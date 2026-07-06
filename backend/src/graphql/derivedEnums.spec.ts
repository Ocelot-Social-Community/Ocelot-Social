import { ENV_CATEGORIES } from '@src/config/categories'
import { allKeys } from '@src/policy/schema'

import { derivedEnumSDLs, enumSDL, envCategoryEnumSDL, policyKeyEnumSDL } from './derivedEnums'

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

describe('enumSDL', () => {
  it('builds an enum from valid GraphQL names', () => {
    expect(enumSDL('X', ['fooBar', '_x', 'a1'])).toBe('enum X { fooBar _x a1 }')
  })

  it('throws early (naming the offender) for a value that is not a valid GraphQL name', () => {
    // A dot or a leading digit would otherwise crash schema parsing far from the source.
    expect(() => enumSDL('PolicyKey', ['api.key'])).toThrow(/api\.key/)
    expect(() => enumSDL('EnvCategory', ['2fa'])).toThrow(/2fa/)
  })
})
