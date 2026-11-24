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

// How many people are in a call: a user on several tabs or devices once. A connection nobody can
// be told behind counts on its own, so that a call with somebody in it never counts as empty.
export const peopleIn = (participants: { identity?: string; metadata?: string }[]): number => {
  const users = new Set<string>()
  let unknown = 0
  for (const participant of participants) {
    const userId = userIdOf(participant)
    if (userId) {
      users.add(userId)
    } else {
      unknown += 1
    }
  }
  return users.size + unknown
}
