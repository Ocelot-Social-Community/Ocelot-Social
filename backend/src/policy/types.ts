// Hand-maintained mirror of packages/config-schema/generated/policy.types.ts.
// Keep in sync when the canonical schema changes.

export interface NetworkPolicy {
  publicRegistration: boolean
  inviteRegistration: boolean
  categoriesActive: boolean
  apiKeysEnabled: boolean
}

export type PolicyKey = keyof NetworkPolicy
export type Visibility = 'public' | 'admin'
