import { getPolicyService } from '@src/policy/index'
import { getRoleService } from '@src/role/index'

export default {
  Mutation: {
    // Re-read the role & policy caches from the DB. Dev/test recovery hook for a running
    // server whose in-memory caches went stale after an out-of-process DB reset/seed (the
    // separate CLI/test process wipes the DB but cannot clear this process's caches). The
    // shield disables this in production (prod resyncs via a rolling restart).
    resyncCaches: async () => {
      await getRoleService().reload()
      await getPolicyService().reload()
      return true
    },
  },
}
