import gql from 'graphql-tag'

// Admin-only (policy.manage). Every environment variable the deployment recognises,
// with its effective/override/env-value/software-default layers and presence state.
// Secret values are never returned — secrets report presence only — so this is safe
// to surface for diagnosing deployment configuration.
export const systemConfigQuery = gql`
  query {
    systemConfig {
      envKey
      category
      secret
      state
      effective
      override
      envValue
      softwareDefault
      overridable
      policyKey
      blocking
    }
  }
`
