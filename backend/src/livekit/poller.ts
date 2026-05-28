/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

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
import { VIDEO_CALL_PARTICIPANT_COUNT_CHANGED } from '@src/constants/subscriptions'
import { serverPubsub } from '@src/context'
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

let pollTimer: ReturnType<typeof setInterval> | null = null
let initialTimer: ReturnType<typeof setTimeout> | null = null
let polling = false
let consecutiveFailures = 0
let client: RoomServiceClient | null = null
const lastSeenCounts = new Map<string, number>()

const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    // eslint-disable-next-line promise/avoid-new
    new Promise<T>((_resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms.toString()}ms`))
      }, ms)
      if (typeof timer.unref === 'function') timer.unref()
    }),
  ])

const pollOnce = async () => {
  if (!CONFIG.LIVEKIT_ENABLED) return
  // Skip if the previous tick is still in flight — prevents pile-up of
  // pending HTTP requests when LiveKit is slow or unreachable.
  if (polling) return
  // Client is created once in startLiveKitPoller() — bail out cleanly if the
  // poller wasn't started (e.g. direct unit-test invocation).
  if (!client) return
  polling = true
  try {
    let rooms
    try {
      rooms = await withTimeout(client.listRooms(), POLL_TIMEOUT_MS, 'listRooms')
      consecutiveFailures = 0
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (err: unknown) {
      consecutiveFailures += 1
      // Only log first few failures to avoid log spam if LiveKit is down.
      if (consecutiveFailures <= 3) {
        const message = err instanceof Error ? err.message : String(err)
        logger.warn(`LiveKit poll failed (#${consecutiveFailures.toString()}):`, message)
      }
      return
    }
    const seen = new Set<string>()
    for (const room of rooms) {
      if (!room.name?.startsWith('group-')) continue
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
    // event never made it to us, then drop the entry so the map doesn't grow
    // unbounded across long-lived servers with many short-lived rooms.
    for (const [roomName, lastCount] of lastSeenCounts) {
      if (seen.has(roomName)) continue
      if (lastCount > 0) {
        const groupId = groupIdFromRoomName(roomName)
        if (groupId) {
          await serverPubsub.publish(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED, { groupId, count: 0 })
        }
      }
      lastSeenCounts.delete(roomName)
    }
  } finally {
    polling = false
  }
}

const runTick = async () => {
  try {
    await pollOnce()
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.warn('LiveKit poll tick failed:', message)
  }
}

export const startLiveKitPoller = () => {
  if (!CONFIG.LIVEKIT_ENABLED) {
    logger.info('LiveKit disabled — poller not started.')
    return
  }
  if (pollTimer) return
  const livekitUrl = CONFIG.LIVEKIT_URL
  const apiKey = CONFIG.LIVEKIT_API_KEY
  const apiSecret = CONFIG.LIVEKIT_API_SECRET
  if (!livekitUrl || !apiKey || !apiSecret) {
    logger.info('LiveKit env vars incomplete — poller not started.')
    return
  }
  client = new RoomServiceClient(httpUrlFor(livekitUrl), apiKey, apiSecret)
  logger.info(`LiveKit poller starting (every ${(POLL_INTERVAL_MS / 1000).toString()}s).`)
  // First run a bit later so server startup isn't blocked. Tracked so a
  // shutdown within the first 5s can cancel it before it fires.
  initialTimer = setTimeout(() => {
    initialTimer = null
    void runTick()
  }, 5_000)
  if (typeof initialTimer.unref === 'function') initialTimer.unref()
  pollTimer = setInterval(() => {
    void runTick()
  }, POLL_INTERVAL_MS)
  if (typeof pollTimer.unref === 'function') pollTimer.unref()
}

export const stopLiveKitPoller = () => {
  if (initialTimer) {
    clearTimeout(initialTimer)
    initialTimer = null
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  client = null
  consecutiveFailures = 0
  lastSeenCounts.clear()
}
