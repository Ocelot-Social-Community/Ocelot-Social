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

export const unsavedDraftRoomIds = (userId) => {
  const prefix = `${userId}${SEPARATOR}`
  return [...texts.keys()]
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
}

// For tests: each starts without texts left over by another.
export const forgetUnsavedDrafts = () => {
  texts.clear()
  revisions.clear()
}
