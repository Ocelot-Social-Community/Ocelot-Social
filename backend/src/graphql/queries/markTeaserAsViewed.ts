import gql from 'graphql-tag'

export const markTeaserAsViewed = gql`
  mutation ($id: ID!) {
    markTeaserAsViewed(id: $id) {
      id
      viewedTeaserCount
    }
  }
`
