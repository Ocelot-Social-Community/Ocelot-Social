import Vue from 'vue'

// The error classes the backend sets as `extensions.code` (see backend/src/graphql/errors.ts).
// Each has a generic translation for errors that carry no `errorCode` of their own; any other
// class — Apollo's INTERNAL_SERVER_ERROR, GRAPHQL_VALIDATION_FAILED, … — gets the DEFAULT one.
const GENERIC_CODES = ['BAD_USER_INPUT', 'UNAUTHENTICATED', 'FORBIDDEN']

// The Apollo error inside `error`: the error itself, or the first one down its `cause` chain that
// came from an Apollo call — a store action may wrap what it caught (store/auth.js does). So callers
// hand over the error exactly as they caught it, whole, and never have to know how deep it sits.
const apolloErrorOf = (error) => {
  for (let current = error; current; current = current.cause) {
    if (current.graphQLErrors?.length || current.networkError) return current
  }
  return error
}

// The stable `errorCode` of an error from an Apollo call, for code that reacts to one specific
// failure (e.g. showing it next to a form field) instead of only toasting it.
export const backendErrorCode = (error) =>
  apolloErrorOf(error)?.graphQLErrors?.[0]?.extensions?.errorCode ?? null

// Turns an error from an Apollo call into the message to show the user, in their language:
//  1. the translation of its stable `errorCode` (backend/src/graphql/errorRegistry.ts), with its
//     `params` interpolated,
//  2. otherwise the generic translation of its error class, or of a network failure — so the user
//     never sees the backend's English text or an internal detail,
//  3. otherwise (an error that never came from the backend) its own message, as before.
// `i18n` is the component, for its `$t` and `$i18n.keyExists`.
export const backendErrorMessage = (caught, i18n) => {
  // From here on the Apollo error where there is one — else `caught` itself.
  const error = apolloErrorOf(caught)
  const exists = (key) => Boolean(i18n.$i18n?.keyExists?.(key))
  const translate = (key, params) => (exists(key) ? i18n.$t(key, params) : null)

  const [graphQLError] = error?.graphQLErrors ?? []
  if (graphQLError) {
    const { code, errorCode, params } = graphQLError.extensions ?? {}
    const generic = GENERIC_CODES.includes(code) ? code : 'DEFAULT'
    const message =
      (errorCode && translate(`backendErrors.${errorCode}`, params)) ||
      translate(`backendErrors.generic.${generic}`)
    if (message) return message
  } else if (error?.networkError) {
    const message = translate('backendErrors.generic.NETWORK_ERROR')
    if (message) return message
  }
  return error?.message ?? String(error)
}

export default () => {
  Vue.prototype.$backendError = function (error) {
    return backendErrorMessage(error, this)
  }
  // The usual reaction to a failed request: show that message as an error toast. Where the message
  // goes into a sentence of the component's own, `$backendError` is still the one to use.
  Vue.prototype.$toastBackendError = function (error) {
    this.$toast.error(this.$backendError(error))
  }
}
