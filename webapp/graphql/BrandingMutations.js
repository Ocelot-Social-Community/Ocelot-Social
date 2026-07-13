import gql from 'graphql-tag'

// Switch the live network branding (stored as the activeBranding policy value, gated by
// branding.manage). Returns the applied id. The switch propagates to every client via the
// policyChanged subscription (activeBranding is a public policy key).
export const setActiveBrandingMutation = () => gql`
  mutation setActiveBranding($id: String!) {
    setActiveBranding(id: $id)
  }
`

// Set the per-bucket composition (JSON string mapping a bucket slot → source 'id[@version][/name]',
// layered over activeBranding; '' clears it). Gated by branding.manage, broadcast via policyChanged.
export const setBrandingCompositionMutation = () => gql`
  mutation setBrandingComposition($composition: String!) {
    setBrandingComposition(composition: $composition)
  }
`
