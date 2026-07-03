/* eslint-disable n/no-process-env */
import { systemConfigStatus } from '@src/config/systemConfig'

import type { Context } from '@src/context'

export default {
  Query: {
    // Admin-only (policy.manage, see permissionsMiddleware). One row per env var the
    // deployment recognises, merging the static registry with the live policy overlay.
    // Reads presence/values straight from process.env (the same source the policy
    // service was initialised with); secret values are never returned.
    systemConfig: (_parent: unknown, _args: unknown, context: Context) => {
      const { policy } = context
      if (!policy) return []
      return systemConfigStatus(process.env, policy)
    },
  },
}
