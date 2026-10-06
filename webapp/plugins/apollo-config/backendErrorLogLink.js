import { ApolloLink, Observable } from 'apollo-link'

// What the user gets to see of a backend error is its translation (plugins/backend-error.js) — or
// only a generic sentence, where a component reacts to any failure with its own toast. Neither tells
// a developer or a supporter WHICH error it was. So every GraphQL error is also written to the
// browser console as the backend sent it: its stable `errorCode` (backend/src/graphql/
// errorRegistry.ts), its error class and its untranslated English text.
//
// A link rather than a line in `$backendError`, so that an error is logged exactly once and whether
// or not the component that made the request shows it.
const logBackendError = (operation, { message, extensions = {}, path }) => {
  const { code, errorCode, params } = extensions
  const codes = [errorCode, code].filter(Boolean).join(' / ') || 'no code'
  // eslint-disable-next-line no-console
  console.error(`[backend error] ${codes}: ${message}`, {
    operation: operation.operationName,
    ...(path && { path }),
    ...(params && { params }),
  })
}

export const createBackendErrorLogLink = () =>
  new ApolloLink(
    (operation, forward) =>
      new Observable((observer) => {
        const subscription = forward(operation).subscribe({
          next: (result) => {
            ;(result?.errors ?? []).forEach((error) => logBackendError(operation, error))
            observer.next(result)
          },
          complete: () => observer.complete(),
          error: (networkError) => observer.error(networkError),
        })
        return () => subscription.unsubscribe()
      }),
  )
