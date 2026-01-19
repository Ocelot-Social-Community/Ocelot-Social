import gql from 'graphql-tag'

export const User = gql`
  query ($id: ID, $name: String, $email: String) {
    User(id: $id, name: $name, email: $email) {
      id
      name
      badgeTrophiesCount
      badgeTrophies {
        id
      }
      badgeVerification {
        id
        isDefault
      }
      badgeTrophiesSelected {
        id
        isDefault
      }
      followedBy {
        id
      }
      followedByCurrentUser
      following {
        name
        slug
        about
        avatar {
          url
        }
        comments {
          content
          contentExcerpt
        }
        contributions {
          title
          slug
          image {
            url
          }
          content
          contentExcerpt
        }
      }
      isMuted
      isBlocked
      location {
        distanceToMe
      }
      activeCategories
    }
  }
`

export const UserEmailNotificationSettings = gql`
  query ($id: ID, $name: String, $email: String) {
    User(id: $id, name: $name, email: $email) {
      id
      name
      badgeTrophiesCount
      badgeTrophies {
        id
      }
      badgeVerification {
        id
        isDefault
      }
      badgeTrophiesSelected {
        id
        isDefault
      }
      followedBy {
        id
      }
      followedByCurrentUser
      following {
        name
        slug
        about
        avatar {
          url
        }
        comments {
          content
          contentExcerpt
        }
        contributions {
          title
          slug
          image {
            url
          }
          content
          contentExcerpt
        }
      }
      isMuted
      isBlocked
      location {
        distanceToMe
      }
      emailNotificationSettings {
        type
        settings {
          name
          value
        }
      }
      activeCategories
    }
  }
`

export const UserEmail = gql`
  query ($id: ID, $name: String, $email: String) {
    User(id: $id, name: $name, email: $email) {
      id
      name
      email
      badgeTrophiesCount
      badgeTrophies {
        id
      }
      badgeVerification {
        id
        isDefault
      }
      badgeTrophiesSelected {
        id
        isDefault
      }
      followedBy {
        id
      }
      followedByCurrentUser
      following {
        name
        slug
        about
        avatar {
          url
        }
        comments {
          content
          contentExcerpt
        }
        contributions {
          title
          slug
          image {
            url
          }
          content
          contentExcerpt
        }
      }
      isMuted
      isBlocked
      location {
        distanceToMe
      }
      activeCategories
    }
  }
`
