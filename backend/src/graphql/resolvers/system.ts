import { getPolicyService } from '@src/policy'
import { getRoleService } from '@src/role'

export default {
  Mutation: {
    // Re-read the role & policy caches from the DB. Recovery hook for a running server
    // whose in-memory caches went stale after an out-of-process DB reset/seed (the
    // separate CLI/test process wipes the DB but cannot clear this process's caches).
    // Authorization is enforced by the shield (system.resync in prod; open in dev/test).
    resyncCaches: async () => {
      await getRoleService().reload()
      await getPolicyService().reload()
      return true
    },
  },
}
