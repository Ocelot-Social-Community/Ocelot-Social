import { describe, it, expect } from 'vitest'

import { assertWipeAllowed } from './assertWipeAllowed'

describe(assertWipeAllowed, () => {
  it('lets an instance that allows it be wiped', () => {
    expect(() => {
      assertWipeAllowed({ DB_WIPE_ALLOWED: true }, 'db:seed')
    }).not.toThrow()
  })

  it('refuses everywhere else, naming the command and the switch', () => {
    expect(() => {
      assertWipeAllowed({ DB_WIPE_ALLOWED: false }, 'db:reset')
    }).toThrow(/^db:reset wipes the database.*DB_WIPE_ALLOWED=true/)
  })

  it('points an instance still on the old switch at the new one', () => {
    expect(() => {
      assertWipeAllowed({ DB_WIPE_ALLOWED: false }, 'db:seed')
    }).toThrow('It replaces PRODUCTION_DB_CLEAN_ALLOW, which is no longer read.')
  })
})
