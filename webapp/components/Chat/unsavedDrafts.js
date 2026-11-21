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

export const unsavedDraftRoomIds = (userId) => {
  const prefix = `${userId}${SEPARATOR}`
  return [...texts.keys()]
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
}

// For tests: each starts without texts left over by another.
export const forgetUnsavedDrafts = () => {
  texts.clear()
}
