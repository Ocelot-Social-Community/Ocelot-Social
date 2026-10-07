import gql from 'graphql-tag'

// Hashtags to offer while typing one; see components/Editor/hashtagSuggestions.js.
export const hashtagSuggestionsQuery = () => {
  return gql`
    query ($query: String, $first: Int) {
      hashtagSuggestions(query: $query, first: $first) {
        relation
        tag {
          id
        }
      }
    }
  `
}
