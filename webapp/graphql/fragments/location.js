import gql from 'graphql-tag'

export const location = (type, lang) => gql`
  fragment locationOn${type} on ${type} {
    locationName
    location {
      id
      name(lang: "${lang}")
      lng
      lat
      distanceToMe
    }
  }
`
