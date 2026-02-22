import { gql } from 'graphql-tag'

export const UpdateUser = gql`
  mutation (
    $id: ID!
    $slug: String
    $name: String
    $about: String
    $allowEmbedIframes: Boolean
    $showShoutsPublicly: Boolean
    $emailNotificationSettings: [EmailNotificationSettingsInput]
    $termsAndConditionsAgreedVersion: String
    $avatar: ImageInput
    $locationName: String # empty string '' sets it to null
    $locale: String
  ) {
    UpdateUser(
      id: $id
      slug: $slug
      name: $name
      about: $about
      allowEmbedIframes: $allowEmbedIframes
      showShoutsPublicly: $showShoutsPublicly
      emailNotificationSettings: $emailNotificationSettings
      termsAndConditionsAgreedVersion: $termsAndConditionsAgreedVersion
      avatar: $avatar
      locationName: $locationName
      locale: $locale
    ) {
      id
      slug
      name
      about
      allowEmbedIframes
      showShoutsPublicly
      termsAndConditionsAgreedVersion
      termsAndConditionsAgreedAt
      locationName
      locale
      location {
        name
        nameDE
        nameEN
        nameRU
      }
      emailNotificationSettings {
        type
        settings {
          name
          value
        }
      }
      avatar {
        url
        alt
        sensitive
        aspectRatio
        type
      }
      badgeVerification {
        id
        description
        icon
      }
    }
  }
`
