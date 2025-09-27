import gql from 'graphql-tag'

export const UpdateUser = gql`
  mutation (
    $id: ID!
    $name: String
    $termsAndConditionsAgreedVersion: String
    $locationName: String # empty string '' sets it to null
    $emailNotificationSettings: [EmailNotificationSettingsInput]
  ) {
    UpdateUser(
      id: $id
      name: $name
      termsAndConditionsAgreedVersion: $termsAndConditionsAgreedVersion
      locationName: $locationName
      emailNotificationSettings: $emailNotificationSettings
    ) {
      id
      name
      termsAndConditionsAgreedVersion
      termsAndConditionsAgreedAt
      locationName
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
    }
  }
`
