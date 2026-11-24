// This browser tab's own id, sent along with every join of a video call. The server takes out
// of the call any connection that an earlier join of the same tab left behind, once the tab is
// in again — and never one of the user's other tabs or devices (#10682).
//
// The same id after a reload, so the connection of the page before is taken out too; another
// one in every other tab. sessionStorage gives the first, but a duplicated tab starts with a
// copy of it. So the id is taken out of it as soon as the page loads, and put back only when the
// page is left: a tab duplicated in between finds none, and makes its own.

const KEY = 'videoCall.tabClientId'
// What the server accepts (identityFor in backend/src/livekit/rooms.ts).
const VALID = /^[A-Za-z0-9_-]{8,64}$/

let id = null

const newId = () => {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  return random.replace(/[^A-Za-z0-9_-]/g, '')
}

const storage = () => {
  try {
    return window.sessionStorage
  } catch (_e) {
    // Blocked, as in some private windows: an id for this page only.
    return null
  }
}

const takeStored = () => {
  const store = storage()
  if (!store) return null
  try {
    const stored = store.getItem(KEY)
    store.removeItem(KEY)
    return stored && VALID.test(stored) ? stored : null
  } catch (_e) {
    return null
  }
}

const putBack = () => {
  const store = storage()
  if (!store || !id) return
  try {
    store.setItem(KEY, id)
  } catch (_e) {
    /* full or blocked: the next page makes an id of its own */
  }
}

/** Taken from the page before, if there was one; called when the page loads. */
export const startTabClientId = () => {
  if (typeof window === 'undefined') return
  id = takeStored() || newId()
  window.addEventListener('pagehide', putBack)
  // Back from the back/forward cache: the page lives on, so the id is its own again.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) takeStored()
  })
}

export const tabClientId = () => {
  if (!id) id = newId()
  return id
}

// For the tests: forget the id, as a new page would.
export const resetTabClientId = () => {
  id = null
}

startTabClientId()
