import gql from 'graphql-tag'

export const queryLocations = () => gql`
  query ($place: String!, $lang: String!, $types: String) {
    queryLocations(place: $place, lang: $lang, types: $types) {
      place_name
      id
    }
  }
`
