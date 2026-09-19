import gql from 'graphql-tag'

// parent nested 4 levels deep — enough for the longest realistic chain
// (address/poi -> neighborhood/locality -> place -> region -> country) —
// so LocationInfo can build a full "Ottensen, Hamburg, Germany"-style name
// the same way LocationSelect's own search results already do (Mapbox's own
// place_name), instead of just the bare "Ottensen" the Location node's own
// name alone would give.
export const location = (type, lang) => gql`
  fragment locationOn${type} on ${type} {
    locationName
    location {
      id
      name(lang: "${lang}")
      lng
      lat
      distanceToMe
      parent {
        name(lang: "${lang}")
        parent {
          name(lang: "${lang}")
          parent {
            name(lang: "${lang}")
            parent {
              name(lang: "${lang}")
            }
          }
        }
      }
    }
  }
`
