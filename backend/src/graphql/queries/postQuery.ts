import gql from 'graphql-tag'

export const postQuery = () => {
  return gql`
    query Post($id: ID!) {
      Post(id: $id) {
        id
        title
        content
      }
    }
  `
}
