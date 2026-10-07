import { GraphQLError } from 'graphql'

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
}

// The params an entry is thrown with: the placeholders in its text.
type ParamNames<Entry extends ErrorEntry> = Placeholders<Entry['text']>

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

// Errors without a code: developer-facing input (filter syntax, paging arguments, …) that no user
// can trigger through the webapp. The webapp shows the generic message for their class. Every
// error a user can trigger belongs in errorRegistry.ts and is thrown as an AppError instead.
export class UserInputError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'BAD_USER_INPUT' } })
  }
}

export class AuthenticationError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'UNAUTHENTICATED' } })
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'FORBIDDEN' } })
  }
}
