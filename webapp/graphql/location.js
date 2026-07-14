import gql from 'graphql-tag'

export const queryLocations = () => gql`
  query ($place: String!, $lang: String!, $types: String, $proximity: String) {
    queryLocations(place: $place, lang: $lang, types: $types, proximity: $proximity) {
      place_name
      id
    }
  }
`
