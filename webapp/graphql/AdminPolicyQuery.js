import gql from 'graphql-tag'

export default () => gql`
  query adminPolicy {
    adminPolicy {
      publicRegistration
      inviteRegistration
      categoriesActive
      apiKeysEnabled
    }
  }
`
