// Hand-maintained type definitions for the network policy.
// Must stay in sync with ./policy.schema.json — when adding/removing/renaming
// a key in the schema, mirror it here.

export interface NetworkPolicy {
  publicRegistration: boolean
  inviteRegistration: boolean
  categoriesActive: boolean
  apiKeysEnabled: boolean
}

export type PolicyKey = keyof NetworkPolicy
export type Visibility = 'public' | 'admin'
