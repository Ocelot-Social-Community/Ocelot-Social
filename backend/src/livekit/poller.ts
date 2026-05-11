/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Fallback for environments where LiveKit webhooks can't reach the backend
 * (firewall, missing config, ad-hoc dev setup). Periodically lists rooms via
 * the LiveKit server API and publishes participant-count changes through the
 * same pubsub channel as the webhook, so the GraphQL subscription stays in
 * sync either way. Idempotent against the webhook — duplicate events with
 * the same count have no observable effect.
 */
import { RoomServiceClient } from 'livekit-server-sdk'

import CONFIG from '@src/config'
import { serverPubsub } from '@src/context'
import { VIDEO_CALL_PARTICIPANT_COUNT_CHANGED } from '@src/constants/subscriptions'
import { groupIdFromRoomName } from '@src/graphql/resolvers/videoCalls'
import logger from '@src/logger'

const POLL_INTERVAL_MS = 15_000
const POLL_TIMEOUT_MS = 8_000

const httpUrlFor = (livekitUrl: string) =>
  livekitUrl.startsWith('wss://')
    ? livekitUrl.replace(/^wss:\/\//, 'https://')
    : livekitUrl.startsWith('ws://')
      ? livekitUrl.replace(/^ws:\/\//, 'http://')
      : livekitUrl

let pollTimer: NodeJS.Timeout | null = null
let polling = false
let consecutiveFailures = 0
const lastSeenCounts = new Map<string, number>()

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ])

const pollOnce = async () => {
  if (!CONFIG.LIVEKIT_ENABLED) return
  // Skip if the previous tick is still in flight — prevents pile-up of
  // pending HTTP requests when LiveKit is slow or unreachable.
  if (polling) return
  polling = true
  try {
    const client = new RoomServiceClient(
      httpUrlFor(CONFIG.LIVEKIT_URL!),
      CONFIG.LIVEKIT_API_KEY!,
      CONFIG.LIVEKIT_API_SECRET!,
    )
    let rooms
    try {
      rooms = await withTimeout(client.listRooms(), POLL_TIMEOUT_MS, 'listRooms')
      consecutiveFailures = 0
    } catch (err) {
      consecutiveFailures += 1
      // Only log first few failures to avoid log spam if LiveKit is down.
      if (consecutiveFailures <= 3) {
        logger.warn(
          `LiveKit poll failed (#${consecutiveFailures}):`,
          err instanceof Error ? err.message : err,
        )
      }
      return
    }
    const seen = new Set<string>()
    for (const room of rooms) {
      if (!room.name || !room.name.startsWith('group-')) continue
      seen.add(room.name)
      const groupId = groupIdFromRoomName(room.name)
      if (!groupId) continue
      // room.numParticipants is a number; gracefully coerce in case of bigint
      const count = Number(room.numParticipants ?? 0) || 0
      if (lastSeenCounts.get(room.name) !== count) {
        lastSeenCounts.set(room.name, count)
        await serverPubsub.publish(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED, { groupId, count })
      }
    }
    // Rooms that disappeared from LiveKit's list since the last poll — emit a
    // final count: 0 so the badge clears even if the webhook room_finished
    // event never made it to us.
    for (const [roomName, lastCount] of lastSeenCounts) {
      if (!seen.has(roomName) && lastCount > 0) {
        lastSeenCounts.set(roomName, 0)
        const groupId = groupIdFromRoomName(roomName)
        if (groupId) {
          await serverPubsub.publish(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED, { groupId, count: 0 })
        }
      }
    }
  } finally {
    polling = false
  }
}

export const startLiveKitPoller = () => {
  if (!CONFIG.LIVEKIT_ENABLED) {
    logger.info('LiveKit disabled — poller not started.')
    return
  }
  if (pollTimer) return
  logger.info(`LiveKit poller starting (every ${POLL_INTERVAL_MS / 1000}s).`)
  // Fire-and-forget; never let polling errors crash the process.
  const tick = () => {
    pollOnce().catch((err) => {
      logger.warn('LiveKit poll tick failed:', err)
    })
  }
  // First run a bit later so server startup isn't blocked.
  setTimeout(tick, 5_000)
  pollTimer = setInterval(tick, POLL_INTERVAL_MS)
  if (typeof pollTimer.unref === 'function') pollTimer.unref()
}

export const stopLiveKitPoller = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  lastSeenCounts.clear()
}
