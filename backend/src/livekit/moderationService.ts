// Keeping a call's moderation in step with who is in it, and telling the participants.
//
// Called whenever the moderation may have changed: after every act of moderation, when somebody
// joins the call's chat (which is when a session opens), and by the poller on every poll of a room
// with people in it — the one place that notices a moderator who has simply gone, and that puts
// right what an act of moderation left undone.
import { TwirpError } from 'livekit-server-sdk'

import {
  identitiesOf,
  listConnections,
  moderationMetadata,
  notify,
  presentUsers,
  publishModeration,
  readModeration,
  removeConnections,
  settleModeration,
} from '@src/livekit/moderation'
import { liveKitConfigOf, roomNameForGroup, roomServiceFor, userIdOf } from '@src/livekit/rooms'
import logger from '@src/logger'

import type { Connection } from '@src/livekit/moderation'
import type { LiveKitConfig } from '@src/livekit/rooms'
import type { Driver } from 'neo4j-driver'

interface Dependencies {
  driver: Driver
  config: Partial<Record<keyof LiveKitConfig, string>>
}

/** The connections in the group's room; none if the media server has no such room. */
export const connectionsOf = async (
  config: LiveKitConfig,
  groupId: string,
): Promise<Connection[]> => {
  try {
    return await listConnections(roomServiceFor(config), roomNameForGroup(groupId), userIdOf)
  } catch (err) {
    if (err instanceof TwirpError && (err.status === 404 || err.code === 'not_found')) {
      return []
    }
    throw err
  }
}

interface Upkeep {
  /**
   * The metadata the room has now, as the media server listed it. Given, the state is published
   * only if it differs — the poller asks on every poll, and every publish reaches every
   * participant.
   */
  published?: string
  /**
   * The id of the media-server room as listed. Given, whoever was removed from the call and is
   * still in it is disconnected: a removal whose disconnecting failed for one of their devices is
   * finished this way. Only if the session is that room's: a session left over from an earlier
   * room of the same name, not yet replaced, removed nobody from the call running now.
   */
  leftoversIn?: string
}

/**
 * Makes sure the group's running call has a moderator (see settleModeration), hands the state to
 * the media server for every participant, and tells whoever was made a moderator. Never throws:
 * the moderation in the database stands either way, and the next poll publishes it again.
 */
export const settleAndPublishModeration = async (
  { driver, config: rawConfig }: Dependencies,
  groupId: string,
  { published, leftoversIn }: Upkeep = {},
): Promise<void> => {
  const config = liveKitConfigOf(rawConfig)
  if (!config) {
    return
  }
  try {
    const connections = await connectionsOf(config, groupId)
    if (connections.length === 0) {
      return
    }
    const client = roomServiceFor(config)
    const roomName = roomNameForGroup(groupId)
    const appointed = await settleModeration(driver, groupId, presentUsers(connections))
    const state = await readModeration(driver, groupId)
    // Published again even when the state is unchanged: two backends acting on the same call at
    // once can publish in the wrong order, and the older state would otherwise stay.
    if (published === undefined || moderationMetadata(state) !== published) {
      await publishModeration(client, roomName, state)
    }
    if (appointed) {
      await notify(
        client,
        roomName,
        { type: 'moderator', reason: 'automatic' },
        identitiesOf(connections, [appointed]),
      )
    }
    const leftovers = connections.filter(
      (connection) => connection.userId && state?.removedIds.includes(connection.userId),
    )
    if (leftoversIn && state?.livekitSid === leftoversIn && leftovers.length > 0) {
      await removeConnections(client, roomName, leftovers)
    }
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err: unknown) {
    logger.warn(`Settling the moderation of the call in group ${groupId} failed:`, err)
  }
}
