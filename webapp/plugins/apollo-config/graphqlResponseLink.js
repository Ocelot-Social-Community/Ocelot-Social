import { ApolloLink, Observable } from 'apollo-link'

// apollo-link-http-common rejects EVERY response with a status >= 300 (`parseAndCheckHttpResponse`
// calls `throwServerError` before it looks at the body), so a request that the backend answered in
// perfectly good GraphQL — `{ errors: [...] }` with a `BAD_USER_INPUT` / `GRAPHQL_VALIDATION_FAILED`
// extension — reaches the component as a `networkError` with no `graphQLErrors` on it. The user is
// told the server is unreachable when in truth the request was malformed.
//
// Apollo Server has always answered 400 for document validation failures, and since v5 it also does
// so for variable coercion errors (`status400ForVariableCoercionErrors` defaults to true there,
// where v4 defaulted to false and returned 200). Both are exactly the class of failure this repo
// has shipped twice — see backend/src/graphql/webappPostFilters.spec.ts on the `orderBy` and
// hashtag-filter outages — so they must surface as GraphQL errors, not as a network outage.
//
// The status itself stays untouched: this reclassifies at the GraphQL layer instead of rewriting
// the HTTP response, so nothing downstream is lied to about what came over the wire.
const isGraphqlResponse = (networkError) =>
  // `ServerError` carries the PARSED body on `.result`; a body that failed to parse yields a
  // `ServerParseError` with `.bodyText` and no `.result`, which is a genuine transport fault.
  Boolean(networkError) &&
  Array.isArray(networkError.result?.errors) &&
  networkError.result.errors.length > 0 &&
  // 4xx only. A 5xx means the server itself broke; Apollo attaches an errors array to those too,
  // and swallowing them here would hide every backend crash behind a field-level error message.
  networkError.statusCode >= 400 &&
  networkError.statusCode < 500

export const createGraphqlResponseLink = () =>
  new ApolloLink(
    (operation, forward) =>
      new Observable((observer) => {
        const subscription = forward(operation).subscribe({
          next: (result) => observer.next(result),
          complete: () => observer.complete(),
          error: (networkError) => {
            if (!isGraphqlResponse(networkError)) {
              observer.error(networkError)
              return
            }
            // Hand the body on as the operation's result. `data` is forwarded as the backend sent
            // it (absent on a validation failure, possibly partial otherwise) so that vue-apollo
            // applies the same partial-data rules it would for a 200 response.
            observer.next(networkError.result)
            observer.complete()
          },
        })
        return () => subscription.unsubscribe()
      }),
  )
