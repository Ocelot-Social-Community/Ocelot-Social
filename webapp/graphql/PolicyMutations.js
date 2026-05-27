import gql from 'graphql-tag'

export const setPolicyMutation = () => gql`
  mutation setPolicy($key: String!, $value: String!) {
    setPolicy(key: $key, value: $value) {
      key
      value
      actor
      timestamp
    }
  }
`

export const resetPolicyMutation = () => gql`
  mutation resetPolicy($key: String!) {
    resetPolicy(key: $key) {
      key
      value
      actor
      timestamp
    }
  }
`
