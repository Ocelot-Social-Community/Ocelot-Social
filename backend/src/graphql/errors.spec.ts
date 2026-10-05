import { GraphQLError } from 'graphql'
import { describe, it, expect } from 'vitest'

import { ErrorCode } from './errorCodes'
import { Errors } from './errorRegistry'
import { AppError, AuthenticationError, ForbiddenError, UserInputError } from './errors'

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
      new ForbiddenError('Not Authorized!', { code: ErrorCode.NOT_AUTHORIZED }).extensions,
    ).toEqual({ code: 'FORBIDDEN', errorCode: 'NOT_AUTHORIZED' })
  })

  it('adds the params the translation interpolates', () => {
    expect(
      new UserInputError('Not a member of this group.', {
        code: ErrorCode.NOT_GROUP_MEMBER,
        params: { email: 'a@b.c' },
      }).extensions,
    ).toEqual({
      code: 'BAD_USER_INPUT',
      errorCode: 'NOT_GROUP_MEMBER',
      params: { email: 'a@b.c' },
    })
  })
})

describe('ErrorCode', () => {
  it('maps every code to itself, so the webapp can use the value as the locale key', () => {
    for (const [key, value] of Object.entries(ErrorCode)) {
      expect(value).toBe(key)
    }
  })

  it('shares no code with the registry', () => {
    for (const code of Object.keys(ErrorCode)) {
      expect(Object.keys(Errors)).not.toContain(code)
    }
  })
})

describe(AppError, () => {
  it('takes type, code and text from the registry', () => {
    const error = new AppError(Errors.API_KEYS_FEATURE_DISABLED)

    expect(error).toBeInstanceOf(GraphQLError)
    expect(error.message).toBe('API keys are not enabled')
    expect(error.extensions).toEqual({ code: 'FORBIDDEN', errorCode: 'API_KEYS_FEATURE_DISABLED' })
  })

  it('fills the placeholders and sends the params along', () => {
    const error = new AppError(Errors.API_KEY_CREATE_LIMIT_REACHED, { max: 3 })

    expect(error.message).toBe('Maximum of 3 active API keys reached')
    expect(error.extensions).toEqual({
      code: 'BAD_USER_INPUT',
      errorCode: 'API_KEY_CREATE_LIMIT_REACHED',
      params: { max: 3 },
    })
  })

  it('sends declared params along that the English text leaves out', () => {
    const error = new AppError(Errors.GROUP_SAVE_TOO_MANY_CATEGORIES, { max: 3 })

    expect(error.message).toBe('Too many categories!')
    expect(error.extensions).toEqual({
      code: 'BAD_USER_INPUT',
      errorCode: 'GROUP_SAVE_TOO_MANY_CATEGORIES',
      params: { max: 3 },
    })
  })

  it('lets the compiler check the params against the entry', () => {
    // @ts-expect-error a text with placeholders requires its params
    expect(new AppError(Errors.API_KEY_CREATE_LIMIT_REACHED).message).toBe(
      'Maximum of {max} active API keys reached',
    )
    // @ts-expect-error declared params are required as well
    expect(new AppError(Errors.GROUP_SAVE_TOO_MANY_CATEGORIES).extensions).not.toHaveProperty(
      'params',
    )
    // @ts-expect-error a param the entry does not use is rejected
    expect(new AppError(Errors.API_KEY_CREATE_LIMIT_REACHED, { max: 3, min: 1 }).message).toBe(
      'Maximum of 3 active API keys reached',
    )
    // @ts-expect-error an entry without params takes none
    expect(new AppError(Errors.API_KEYS_FEATURE_DISABLED, { max: 3 }).extensions).toMatchObject({
      params: { max: 3 },
    })
  })
})

describe('Errors', () => {
  it('derives every code from its name, so it is written once', () => {
    for (const [name, error] of Object.entries(Errors)) {
      expect(error.code).toBe(name)
    }
  })

  it('names every code <AREA>_<OBJECT>_<PROBLEM> in capitals', () => {
    for (const name of Object.keys(Errors)) {
      const words = name.split('_')

      expect(words.length).toBeGreaterThanOrEqual(3)

      for (const word of words) {
        expect(word).toMatch(/^[A-Z]+$/)
      }
    }
  })
})
