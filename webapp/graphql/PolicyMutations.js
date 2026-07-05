import gql from 'graphql-tag'

export const setPolicyMutation = () => gql`
  mutation setPolicy($key: PolicyKey!, $value: String!) {
    setPolicy(key: $key, value: $value) {
      key
      value
      actor
      timestamp
    }
  }
`

export const resetPolicyMutation = () => gql`
  mutation resetPolicy($key: PolicyKey!) {
    resetPolicy(key: $key) {
      key
      value
      actor
      timestamp
    }
  }
`

export const resetPoliciesMutation = () => gql`
  mutation resetPolicies($keys: [PolicyKey!]!) {
    resetPolicies(keys: $keys) {
      key
      value
      actor
      timestamp
    }
  }
`
