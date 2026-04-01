import gql from 'graphql-tag'

export const mapQuery = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    query MapData($postFilter: _PostFilter) {
      User(filter: { hasLocation: true }) {
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
      Group(hasLocation: true) {
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
      }
    }
  `
}
