import { UserInputError } from '@graphql/errors'
import { PolicyValidationError } from '@src/policy'

import type { Context } from '@src/context'

// The active branding is stored as the `activeBranding` policy value, so switching it reuses the
// PolicyService (persistence + Redis pub/sub) end to end: a change fires `policyChanged` and every
// connected client reloads the new brand. This mutation exists (rather than reusing setPolicy) only
// to carry its own permission — `branding.manage` — instead of the broad `policy.manage`. The brand
// id is not validated against the manifest here (the backend has no manifest); the admin UI only
// offers ids from /branding/manifest.json, and '' resets to framework defaults.
export default {
  Mutation: {
    setActiveBranding: async (
      _parent: unknown,
      { id }: { id: string },
      context: Context,
    ): Promise<string> => {
      const { policy, user } = context
      try {
        // Persist + broadcast (policyChanged) the switch; the applied value is `id` verbatim
        // (a string key takes no coercion), so echo it back as the confirmation.
        await policy.set('activeBranding', id, user?.id ?? 'unknown')
        return id
      } catch (err) {
        if (err instanceof PolicyValidationError) {
          throw new UserInputError(err.message)
        }
        throw err
      }
    },
    // Per-bucket composition (layered over activeBranding). Same PolicyService + branding.manage path;
    // the value is a JSON-encoded slot→source map ('' clears it).
    setBrandingComposition: async (
      _parent: unknown,
      { composition }: { composition: string },
      context: Context,
    ): Promise<string> => {
      const { policy, user } = context
      // Validate empty OR a JSON object, so a malformed value can never be persisted and break the
      // SSR loader (which JSON.parses it). Stored verbatim like activeBranding.
      if (composition !== '') {
        let parsed: unknown
        try {
          parsed = JSON.parse(composition)
        } catch {
          throw new UserInputError('brandingComposition must be empty or a JSON object')
        }
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new UserInputError('brandingComposition must be a JSON object')
        }
      }
      try {
        await policy.set('brandingComposition', composition, user?.id ?? 'unknown')
        return composition
      } catch (err) {
        if (err instanceof PolicyValidationError) {
          throw new UserInputError(err.message)
        }
        throw err
      }
    },
  },
}
