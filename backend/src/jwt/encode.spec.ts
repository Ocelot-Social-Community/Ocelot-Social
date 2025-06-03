/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { verify } from 'jsonwebtoken'

import { TEST_CONFIG } from '@root/test/helpers'

import { encode } from './encode'

const jwt = { verify }
const config = {
  JWT_SECRET: 'supersecret',
  JWT_EXPIRES: TEST_CONFIG.JWT_EXPIRES,
  CLIENT_URI: TEST_CONFIG.CLIENT_URI,
  GRAPHQL_URI: TEST_CONFIG.GRAPHQL_URI,
}
const context = { config }

describe('encode', () => {
  let payload
  beforeEach(() => {
    payload = {
      name: 'Some body',
      slug: 'some-body',
      id: 'some-id',
    }
  })

  it('encodes a valided JWT bearer token', () => {
    const token = encode(context)(payload)
    expect(token.split('.')).toHaveLength(3)
    const decoded = jwt.verify(token, context.config.JWT_SECRET)
    expect(decoded).toEqual({
      name: 'Some body',
      slug: 'some-body',
      id: 'some-id',
      sub: 'some-id',
      aud: expect.any(String),
      iss: expect.any(String),
      iat: expect.any(Number),
      exp: expect.any(Number),
    })
  })

  describe('given sensitive data', () => {
    beforeEach(() => {
      payload = {
        ...payload,
        email: 'none-of-your-business@example.org',
        password: 'topsecret',
      }
    })

    it('does not encode sensitive data', () => {
      const token = encode(context)(payload)
      expect(payload).toEqual({
        email: 'none-of-your-business@example.org',
        password: 'topsecret',
        name: 'Some body',
        slug: 'some-body',
        id: 'some-id',
      })
      const decoded = jwt.verify(token, context.config.JWT_SECRET)
      expect(decoded).toEqual({
        name: 'Some body',
        slug: 'some-body',
        id: 'some-id',
        sub: 'some-id',
        aud: expect.any(String),
        iss: expect.any(String),
        iat: expect.any(Number),
        exp: expect.any(Number),
      })
    })
  })
})
