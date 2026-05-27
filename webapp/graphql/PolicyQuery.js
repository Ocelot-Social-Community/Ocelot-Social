import gql from 'graphql-tag'

export default () => gql`
  query publicPolicy {
    publicPolicy {
      publicRegistration
      inviteRegistration
      categoriesActive
      apiKeysEnabled
    }
  }
`
