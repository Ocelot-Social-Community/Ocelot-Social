import gql from 'graphql-tag'

export default () => gql`
  subscription policyChanged {
    policyChanged {
      key
      value
      actor
      timestamp
    }
  }
`
