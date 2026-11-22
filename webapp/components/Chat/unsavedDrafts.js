// Texts kept as a chat's draft whose save failed, per user and room. Held outside the chat
// component: a save still under way when the chat is closed may fail afterwards, and the chat
// opened again — the same component or another one, like a call's chat — is to find the text
// and save it again. They last as long as the page does.

const texts = new Map()
const SEPARATOR = '\u0000'
const keyOf = (userId, roomId) => `${userId}${SEPARATOR}${roomId}`

export const unsavedDraft = (userId, roomId) => texts.get(keyOf(userId, roomId))

export const setUnsavedDraft = (userId, roomId, text) => {
  texts.set(keyOf(userId, roomId), text)
}

export const clearUnsavedDraft = (userId, roomId) => {
  texts.delete(keyOf(userId, roomId))
}

// The addresses of a draft's files taken out whose removal failed, per user and room: no longer
// shown, removed again later — also by a chat opened anew, should the one that failed be closed.
const goneFiles = new Map()

export const goneDraftFiles = (userId, roomId) => goneFiles.get(keyOf(userId, roomId)) || []

export const setGoneDraftFiles = (userId, roomId, urls) => {
  if (urls.length) goneFiles.set(keyOf(userId, roomId), urls)
  else goneFiles.delete(keyOf(userId, roomId))
}

// The addresses of draft files removed: a chat may still hold its rooms as they were before, so
// these stay hidden for as long as the page lasts. Addresses are unique.
const removedFiles = new Set()

export const markDraftFileRemoved = (url) => {
  removedFiles.add(url)
}

export const isDraftFileRemoved = (url) => removedFiles.has(url)

// Every change of a draft asked for — a save, or sending, which ends the draft — by whichever chat,
// numbered per user and room. A save that fails is kept for later only while it is the latest:
// one asked for by a chat closed since must not take the place of what a chat opened anew saved.
const revisions = new Map()

export const newDraftRevision = (userId, roomId) => {
  const key = keyOf(userId, roomId)
  const revision = (revisions.get(key) || 0) + 1
  revisions.set(key, revision)
  return revision
}

export const isLatestDraftRevision = (userId, roomId, revision) =>
  revisions.get(keyOf(userId, roomId)) === revision

// What changes a draft on the server — its saves, its files, and sending, which ends it — goes
// one after the other per user and room, whichever chat asked: one replaced by another, like a
// call's chat, must not have a save still under way arrive after a newer one. `waits: false`
// starts the work at once, as nothing may wait while the page is left. Gives the work's promise.
const queues = new Map()

export const queueDraftWork = (userId, roomId, work, { waits = true } = {}) => {
  const key = keyOf(userId, roomId)
  const previous = waits ? queues.get(key) : undefined
  const next = previous ? previous.then(() => work()) : Promise.resolve(work())
  const settled = next
    .catch(() => {})
    .then(() => {
      if (queues.get(key) === settled) queues.delete(key)
    })
  queues.set(key, settled)
  return next
}

// The rooms with something of the draft still to be kept: a text, or files to be removed.
export const unsavedDraftRoomIds = (userId) => {
  const prefix = `${userId}${SEPARATOR}`
  return [...new Set([...texts.keys(), ...goneFiles.keys()])]
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
}

// For tests: each starts without texts left over by another.
export const forgetUnsavedDrafts = () => {
  texts.clear()
  goneFiles.clear()
  removedFiles.clear()
  revisions.clear()
  queues.clear()
}
