import ocelotLogger from '@src/logger'
import { getPolicyService } from '@src/policy'
import { getRoleService } from '@src/role'

// How long an instance may serve an outdated policy or role after missing its change event.
export const CACHE_RESYNC_INTERVAL_MS = 60_000

let timer: ReturnType<typeof setInterval> | null = null

// The services keep what they have when a read fails, so a run that fails costs one interval.
const resyncCaches = async () => {
  const results = await Promise.allSettled([getPolicyService().resync(), getRoleService().resync()])
  for (const result of results) {
    if (result.status === 'rejected') {
      ocelotLogger.warn('Could not resync the policy and role caches', result.reason)
    }
  }
}

// Pubsub keeps nothing, so an event an instance misses is gone, and only the database can tell.
// That is why this compares against the database and knows nothing about the pubsub in use: it
// runs the same with one instance and the in-process PubSub as with several and Redis, where it
// also covers a reconnect, and it picks up what a CLI changes behind the backend's back.
export const startCacheResync = () => {
  timer = setInterval(() => {
    void resyncCaches()
  }, CACHE_RESYNC_INTERVAL_MS)
  timer.unref()
}

export const stopCacheResync = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
