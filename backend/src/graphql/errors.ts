import { GraphQLError } from 'graphql'

import type { ErrorCode } from './errorCodes'
import type { ErrorName, ErrorType } from './errorRegistry'

type ErrorParams = Record<string, string | number>

// The placeholder names in an error text: 'Maximum of {max} keys' → 'max'.
type Placeholders<Text extends string> = Text extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Placeholders<Rest>
  : never

export interface ErrorEntry {
  code: ErrorName
  type: ErrorType
  text: string
  // Values only the translation uses, on top of the placeholders in the English text.
  params?: readonly string[]
}

// The params an entry is thrown with: the placeholders in its text plus its declared `params`.
type ParamNames<Entry extends ErrorEntry> =
  | Placeholders<Entry['text']>
  | (Entry extends { params: readonly (infer Name extends string)[] } ? Name : never)

// An entry without params takes none, one with params requires exactly those — so a throw site
// cannot forget a value or pass one that nothing uses.
type ParamsFor<Entry extends ErrorEntry> = [ParamNames<Entry>] extends [never]
  ? []
  : [params: Record<ParamNames<Entry>, string | number>]

const fillPlaceholders = (text: string, params?: ErrorParams) => {
  const values = new Map(Object.entries(params ?? {}))
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    values.has(name) ? String(values.get(name)) : placeholder,
  )
}

// An error from the registry (errorRegistry.ts). Its type, code and English text come from there:
//   throw new AppError(Errors.API_KEYS_FEATURE_DISABLED)
//   throw new AppError(Errors.API_KEY_CREATE_LIMIT_REACHED, { max })
export class AppError<Entry extends ErrorEntry = ErrorEntry> extends GraphQLError {
  constructor(error: Entry, ...[params]: ParamsFor<Entry>) {
    super(fillPlaceholders(error.text, params), {
      extensions: { code: error.type, errorCode: error.code, ...(params && { params }) },
    })
  }
}

// What the webapp needs to show a translated message: the stable `errorCode` (see errorCodes.ts)
// and the values its translation interpolates. Both land in `extensions` next to Apollo's own
// error class `code`, which stays untouched.
export interface ErrorDetails {
  code: ErrorCode
  params?: Record<string, string | number>
}

const extensionsFor = (code: string, details?: ErrorDetails) => ({
  code,
  ...(details && { errorCode: details.code, ...(details.params && { params: details.params }) }),
})

export class UserInputError extends GraphQLError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, { extensions: extensionsFor('BAD_USER_INPUT', details) })
  }
}

export class AuthenticationError extends GraphQLError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, { extensions: extensionsFor('UNAUTHENTICATED', details) })
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, { extensions: extensionsFor('FORBIDDEN', details) })
  }
}
