import fs from 'node:fs/promises'
import { join } from 'node:path'

import { GraphQLError } from 'graphql'
import { describe, it, expect } from 'vitest'

import { Errors } from './errorRegistry'
import { AppError, AuthenticationError, ForbiddenError, UserInputError } from './errors'

// The backend's own source, without the registry and the specs: where a code has to be thrown.
const readBackendSource = async (): Promise<string> => {
  const sourceDir = join(import.meta.dirname, '..')
  const files = (await fs.readdir(sourceDir, { recursive: true })).filter(
    (file) =>
      file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('errorRegistry.ts'),
  )
  const contents = await Promise.all(
    // The paths come from readdir over the source tree, not from any input.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    files.map(async (file) => fs.readFile(join(sourceDir, file), 'utf8')),
  )
  return contents.join('\n')
}

describe('GraphQL error classes', () => {
  it.each([
    [UserInputError, 'BAD_USER_INPUT'],
    [AuthenticationError, 'UNAUTHENTICATED'],
    [ForbiddenError, 'FORBIDDEN'],
  ])('%o keeps only the error class code without details', (ErrorClass, code) => {
    expect(new ErrorClass('Ouch!')).toMatchObject({ message: 'Ouch!', extensions: { code } })
    expect(new ErrorClass('Ouch!').extensions).toEqual({ code })
  })
})

describe(AppError, () => {
  it('takes type, code and text from the registry', () => {
    const error = new AppError(Errors.API_KEYS_FEATURE_DISABLED)

    expect(error).toBeInstanceOf(GraphQLError)
    expect(error.message).toBe('API keys are not enabled.')
    expect(error.extensions).toEqual({ code: 'FORBIDDEN', errorCode: 'API_KEYS_FEATURE_DISABLED' })
  })

  it('fills the placeholders and sends the params along', () => {
    const error = new AppError(Errors.API_KEY_CREATE_LIMIT_REACHED, { max: 3 })

    expect(error.message).toBe('Maximum of 3 active API keys reached.')
    expect(error.extensions).toEqual({
      code: 'BAD_USER_INPUT',
      errorCode: 'API_KEY_CREATE_LIMIT_REACHED',
      params: { max: 3 },
    })
  })

  it('lets the compiler check the params against the entry', () => {
    // @ts-expect-error a text with placeholders requires its params
    expect(new AppError(Errors.API_KEY_CREATE_LIMIT_REACHED).message).toBe(
      'Maximum of {max} active API keys reached.',
    )
    // @ts-expect-error a param the entry does not use is rejected
    expect(new AppError(Errors.API_KEY_CREATE_LIMIT_REACHED, { max: 3, min: 1 }).message).toBe(
      'Maximum of 3 active API keys reached.',
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

  // A code nothing throws any more is a translation in eleven languages for a message nobody can
  // see — and scripts/translations/backend-error-codes.sh keeps it alive, since it only holds the
  // locales to the registry. Removing the last throw site has to remove the code with it.
  it('is thrown somewhere, every code of it', async () => {
    const source = await readBackendSource()
    const unused = Object.keys(Errors).filter((name) => !source.includes(`Errors.${name}`))

    expect(unused).toEqual([])
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
