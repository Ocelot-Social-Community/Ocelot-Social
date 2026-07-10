import gql from 'graphql-tag'

// Switch the live network branding (stored as the activeBranding policy value, gated by
// branding.manage). Returns the applied id. The switch propagates to every client via the
// policyChanged subscription (activeBranding is a public policy key).
export const setActiveBrandingMutation = () => gql`
  mutation setActiveBranding($id: String!) {
    setActiveBranding(id: $id)
  }
`
