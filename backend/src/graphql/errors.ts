import { GraphQLError } from 'graphql'

import type { ErrorCode } from './errorCodes'

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
