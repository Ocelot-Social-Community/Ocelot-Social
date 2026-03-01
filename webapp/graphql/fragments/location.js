import gql from 'graphql-tag'

export const location = (type, lang) => gql`
  fragment location on ${type} {
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
