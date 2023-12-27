import { describe, it, expect } from 'vitest'

import { META } from './env'

describe('env', () => {
  it('has correct default values', () => {
    expect(META).toEqual({
      DEFAULT_TITLE: 'IT4C',
      DEFAULT_DESCRIPTION: 'IT4C Frontend Boilerplate',
    })
  })
})
