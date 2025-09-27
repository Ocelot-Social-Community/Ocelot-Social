import gql from 'graphql-tag'

export const toggleObservePost = gql`
  mutation ($id: ID!, $value: Boolean!) {
    toggleObservePost(id: $id, value: $value) {
      isObservedByMe
      observingUsersCount
    }
  }
`
