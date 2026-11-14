import unionBy from 'lodash/unionBy'

export default function UpdateQuery(component, { $state, pageKey }) {
  if (!pageKey) throw new Error('No key given for the graphql query { data } object')
  return (previousResult, { fetchMoreResult }) => {
    const oldData = (previousResult && previousResult[pageKey]) || []
    const newData = (fetchMoreResult && fetchMoreResult[pageKey]) || []
    if (newData.length < component.pageSize) {
      component.hasMore = false
      $state.complete()
    }
    const result = {}
    result[pageKey] = unionBy(oldData, newData, (item) => item.id)
    $state.loaded()
    return result
  }
}

// Loads the next page of a list into its query. Its answer can arrive after the page was left:
// vue-apollo has then stopped the query, and apollo-client 2 rejects with "ObservableQuery with
// this id doesn't exist" while applying it (#10799) — leaving right after muting a user, whose
// reset list asks for a page at once, did that. The answer has nowhere to go then and is dropped;
// any other failure is the caller's as before.
export function fetchMorePage(component, query, { variables, $state, pageKey }) {
  return query
    .fetchMore({ variables, updateQuery: UpdateQuery(component, { $state, pageKey }) })
    .catch((error) => {
      if (component._isDestroyed) return undefined
      throw error
    })
}
