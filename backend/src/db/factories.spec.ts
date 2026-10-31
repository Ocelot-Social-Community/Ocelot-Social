import { compare } from 'bcryptjs'
import { afterEach, describe, expect, it } from 'vitest'

import CONFIG from '@config/index'
import Factory from '@db/factories'

// The factory module is untyped.
const { attributes } = Factory as unknown as {
  attributes: (
    name: string,
    attributes: object,
    options: { password: string },
  ) => { encryptedPassword: string }
}

const hashOf = (password: string) =>
  attributes.call(Factory, 'basicUser', {}, { password }).encryptedPassword

describe('the password of a fixture user', () => {
  afterEach(() => {
    CONFIG.TEST = true
  })

  it('is hashed at the minimum cost under test, and still logs in', async () => {
    const hash = hashOf('1234')

    expect(hash).toMatch(/^\$2[aby]\$04\$/)
    await expect(compare('1234', hash)).resolves.toBe(true)
  })

  it('keeps the full cost outside of test, because seeded data is logged into for real', async () => {
    CONFIG.TEST = false

    const hash = hashOf('1234')

    expect(hash).toMatch(/^\$2[aby]\$10\$/)
    await expect(compare('1234', hash)).resolves.toBe(true)
  })
})
