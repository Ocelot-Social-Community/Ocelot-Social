import gql from 'graphql-tag'

export const queryLocations = () => gql`
  query ($place: String!, $lang: String!) {
    queryLocations(place: $place, lang: $lang) {
      place_name
      id
    }
  }
`
