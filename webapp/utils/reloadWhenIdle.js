import { reloadPage } from '~/utils/reloadPage'

/**
 * A full-page reload that never interrupts a video call (#10353).
 *
 * The call lives in the layout and survives navigation, but not a reload: it would drop the
 * LiveKit connection for this participant. While a call is connecting or running, the reload is
 * deferred until it ends, and `videoCall/reloadPending` says so — the call shows it as a notice.
 *
 * `beforeReload` runs right before the actual reload, not when it is deferred: whatever it
 * records (the branding switch's loop guard) must describe the reload that really happens. When
 * several reloads are asked for during one call, there is still one reload, with the latest
 * `beforeReload` given — a request without one (the admin page's own) keeps the earlier one.
 *
 * Returns whether the reload was deferred.
 */

const CALL_PHASES = ['connecting', 'in-call']

// Per store, so that tests (and anything else with a store of its own) do not share a pending
// reload. Holds `{ beforeReload, unwatch }` while a reload waits.
const pendingReloads = new WeakMap()

export const callInProgress = (store) => CALL_PHASES.includes(store.getters['videoCall/phase'])

const reloadNow = (beforeReload) => {
  beforeReload?.()
  reloadPage()
}

export function reloadWhenIdle(store, { beforeReload } = {}) {
  if (!callInProgress(store)) {
    reloadNow(beforeReload)
    return false
  }
  const pending = pendingReloads.get(store)
  if (pending) {
    if (beforeReload) pending.beforeReload = beforeReload
    return true
  }
  const unwatch = store.watch(
    (_state, getters) => getters['videoCall/phase'],
    () => {
      if (callInProgress(store)) return
      const waiting = pendingReloads.get(store)
      cancelPendingReload(store)
      reloadNow(waiting.beforeReload)
    },
  )
  pendingReloads.set(store, { beforeReload, unwatch })
  store.commit('videoCall/SET_RELOAD_PENDING', true)
  return true
}

/** Drops a deferred reload, e.g. because what it was for has been undone in the meantime. */
export function cancelPendingReload(store) {
  const pending = pendingReloads.get(store)
  if (!pending) return
  pending.unwatch()
  pendingReloads.delete(store)
  store.commit('videoCall/SET_RELOAD_PENDING', false)
}
