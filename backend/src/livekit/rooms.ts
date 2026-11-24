// The media server's rooms as the backend names and reaches them. Shared by the call resolvers,
// the moderation of a call, the poller and the webhook.
import { RoomServiceClient } from 'livekit-server-sdk'

import CONFIG from '@config/index'

// `group-<id>`, behind the instance's own prefix if it has one (LIVEKIT_ROOM_PREFIX). A room
// without that prefix is another instance's: no group of this one, so this one leaves it alone.
export const roomPrefix = () => `${CONFIG.LIVEKIT_ROOM_PREFIX ?? ''}group-`

export const roomNameForGroup = (groupId: string) => `${roomPrefix()}${groupId}`
export const groupIdFromRoomName = (roomName: string | null | undefined): string | null =>
  roomName?.startsWith(roomPrefix()) ? roomName.slice(roomPrefix().length) || null : null

const httpUrlFor = (livekitUrl: string) =>
  livekitUrl.startsWith('wss://')
    ? livekitUrl.replace(/^wss:\/\//, 'https://')
    : livekitUrl.startsWith('ws://')
      ? livekitUrl.replace(/^ws:\/\//, 'http://')
      : livekitUrl

export interface LiveKitConfig {
  LIVEKIT_URL: string
  LIVEKIT_API_KEY: string
  LIVEKIT_API_SECRET: string
}

// The LiveKit part of the server config, when it is complete. The videoConference policy
// requires it (requiresEnv), so with the feature on this is never null.
export const liveKitConfigOf = ({
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
}: Partial<Record<keyof LiveKitConfig, string>>): LiveKitConfig | null =>
  LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET
    ? { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET }
    : null

export const roomServiceFor = (config: LiveKitConfig) =>
  new RoomServiceClient(
    httpUrlFor(config.LIVEKIT_URL),
    config.LIVEKIT_API_KEY,
    config.LIVEKIT_API_SECRET,
  )

// A browser tab's id for itself, as the webapp keeps it for the tab's life (sessionStorage).
const CLIENT_ID = /^[A-Za-z0-9_-]{8,64}$/

/**
 * A connection's identity: unique in the room, as LiveKit takes two connections of one identity
 * for one participant and lets only the newer stay. So each join gets a random suffix, and the
 * same user can be in the call from several devices and tabs. With the tab's id in it
 * (`<userId>#<clientId>#<suffix>`), the connections of one tab can be told apart from the
 * user's others (see clientKeyOf); a malformed id is left out, as from an older webapp.
 */
export const identityFor = (userId: string, clientId: string | null | undefined, suffix: string) =>
  clientId && CLIENT_ID.test(clientId) ? `${userId}#${clientId}#${suffix}` : `${userId}#${suffix}`

/** The user and tab a connection was joined from, `<userId>#<clientId>`; null without a tab id. */
export const clientKeyOf = (identity: string): string | null => {
  const [userId, clientId, suffix, ...rest] = identity.split('#')
  return userId && clientId && suffix && rest.length === 0 ? `${userId}#${clientId}` : null
}

// The user behind a connection: the join token puts it into the metadata, and the identity
// begins with it (see identityFor) for a participant whose metadata is unreadable.
export const userIdOf = (participant: { identity?: string; metadata?: string }): string | null => {
  try {
    const { userId } = JSON.parse(participant.metadata ?? '') as { userId?: unknown }
    if (typeof userId === 'string' && userId) {
      return userId
    }
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch {
    // fall through to the identity
  }
  const [userId] = (participant.identity ?? '').split('#')
  return userId || null
}
