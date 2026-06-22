import { systemConfigStatus } from '@src/permission'

import type { Context } from '@src/context'

export default {
  Query: {
    // Admin-only (see permissionsMiddleware). The full Context structurally satisfies
    // SystemConfigContext (config + policy), so it is passed straight through.
    systemConfig: (_parent: unknown, _args: unknown, context: Context) =>
      systemConfigStatus(context),
  },
}
