import gql from 'graphql-tag'

export default function () {
  return gql`
    query {
      embedProviders {
        name
        url
      }
    }
  `
}
