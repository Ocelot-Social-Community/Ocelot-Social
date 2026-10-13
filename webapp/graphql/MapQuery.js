import gql from 'graphql-tag'

export const mapQuery = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    query MapData(
      $userFilter: _UserFilter
      $groupHasLocation: Boolean
      $withGroups: Boolean = true
      $postFilter: _PostFilter
    ) {
      User(filter: $userFilter) {
        id
        slug
        name
        about
        location {
          id
          name(lang: "${lang}")
          lng
          lat
        }
      }
      # Left out while groups are switched off: the server refuses the field then, and during
      # server-side rendering that refusal fails the whole map page.
      Group(hasLocation: $groupHasLocation) @include(if: $withGroups) {
        id
        slug
        name
        about
        location {
          id
          name(lang: "${lang}")
          lng
          lat
        }
      }
      Post(filter: $postFilter) {
        id
        slug
        title
        content
        postType
        eventStart
        eventEnd
        eventVenue
        eventLocationName
        eventIsOnline
        eventLocation {
          id
          name(lang: "${lang}")
          lng
          lat
        }
        lat
        lng
      }
    }
  `
}
