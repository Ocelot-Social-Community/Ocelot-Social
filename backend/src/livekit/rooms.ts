// The media server's rooms as the backend names and reaches them. Shared by the call resolvers,
// the moderation of a call, the poller and the webhook.
import { RoomServiceClient } from 'livekit-server-sdk'

const ROOM_PREFIX = 'group-'

export const roomNameForGroup = (groupId: string) => `${ROOM_PREFIX}${groupId}`
export const groupIdFromRoomName = (roomName: string | null | undefined): string | null =>
  roomName?.startsWith(ROOM_PREFIX) ? roomName.slice(ROOM_PREFIX.length) : null

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

// The user behind a connection: the join token puts it into the metadata, and the identity is
// `<userId>#<suffix>` (see joinGroupVideoCall) for a participant whose metadata is unreadable.
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
