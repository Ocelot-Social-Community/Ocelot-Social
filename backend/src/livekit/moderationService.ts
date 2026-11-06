// Keeping a call's moderation in step with who is in it, and telling the participants.
//
// Called whenever the moderation may have changed: after every act of moderation, when somebody
// joins the call's chat (which is when a session opens), and by the poller when the number of
// people in a room changes — the one place that notices a moderator who has simply gone.
import { TwirpError } from 'livekit-server-sdk'

import {
  identitiesOf,
  listConnections,
  notify,
  presentUsers,
  publishModeration,
  readModeration,
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

/**
 * Makes sure the group's running call has a moderator (see settleModeration), hands the state to
 * the media server for every participant, and tells whoever was made a moderator. Never throws:
 * the moderation in the database stands either way, and the next change publishes it again.
 */
export const settleAndPublishModeration = async (
  { driver, config: rawConfig }: Dependencies,
  groupId: string,
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
    await publishModeration(client, roomName, await readModeration(driver, groupId))
    if (appointed) {
      await notify(
        client,
        roomName,
        { type: 'moderator', reason: 'automatic' },
        identitiesOf(connections, [appointed]),
      )
    }
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err: unknown) {
    logger.warn(`Settling the moderation of the call in group ${groupId} failed:`, err)
  }
}
