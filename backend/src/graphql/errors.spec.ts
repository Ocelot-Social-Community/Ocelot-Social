import { describe, it, expect } from 'vitest'

import { ErrorCode } from './errorCodes'
import { AuthenticationError, ForbiddenError, UserInputError } from './errors'

describe('GraphQL error classes', () => {
  it.each([
    [UserInputError, 'BAD_USER_INPUT'],
    [AuthenticationError, 'UNAUTHENTICATED'],
    [ForbiddenError, 'FORBIDDEN'],
  ])('%o keeps only the error class code without details', (ErrorClass, code) => {
    expect(new ErrorClass('Ouch!')).toMatchObject({ message: 'Ouch!', extensions: { code } })
    expect(new ErrorClass('Ouch!').extensions).toEqual({ code })
  })

  it('adds the errorCode next to the error class code', () => {
    expect(
      new ForbiddenError('Cannot remove the last owner.', { code: ErrorCode.LAST_OWNER })
        .extensions,
    ).toEqual({ code: 'FORBIDDEN', errorCode: 'LAST_OWNER' })
  })

  it('adds the params the translation interpolates', () => {
    expect(
      new UserInputError('Too many categories!', {
        code: ErrorCode.GROUP_TOO_MANY_CATEGORIES,
        params: { max: 3 },
      }).extensions,
    ).toEqual({
      code: 'BAD_USER_INPUT',
      errorCode: 'GROUP_TOO_MANY_CATEGORIES',
      params: { max: 3 },
    })
  })
})

describe('ErrorCode', () => {
  it('maps every code to itself, so the webapp can use the value as the locale key', () => {
    for (const [key, value] of Object.entries(ErrorCode)) {
      expect(value).toBe(key)
    }
  })
})
