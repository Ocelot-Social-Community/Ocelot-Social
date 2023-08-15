import gql from 'graphql-tag'

export default () => {
  return gql`
    query {
      Category(orderBy: slug_asc) {
        id
        slug
        icon
      }
    }
  `
}
