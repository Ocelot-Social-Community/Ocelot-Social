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
import { markRoomTold, takeToldRooms } from '@src/livekit/toldRooms'
import { withTimeout } from '@src/livekit/utils'
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

const pollOnce = async () => {
  if (!CONFIG.LIVEKIT_ENABLED) {
    return
  }
  // Skip if the previous tick is still in flight — prevents pile-up of
  // pending HTTP requests when LiveKit is slow or unreachable.
  if (polling) {
    return
  }
  // Client is created once in startLiveKitPoller() — bail out cleanly if the
  // poller wasn't started (e.g. direct unit-test invocation).
  if (!client) {
    return
  }
  polling = true
  // The told rooms (see below) still owed their correction. Whatever is left when this poll
  // ends — because LiveKit could not be asked, or because publishing failed halfway through —
  // goes back, so the next poll makes up for it. Without that, a room this poller never saw
  // itself would be forgotten: nothing else remembers that a client was told about it.
  const owed = new Set<string>()
  try {
    // Rooms a client was told a running call for (see toldRooms.ts): they get the truth
    // published below even without a change. Taken BEFORE the list is fetched, so that
    // everything told is older than the list it is corrected with — the other way round, a
    // count told a moment after the snapshot would be "corrected" with the older state.
    const told = takeToldRooms()
    for (const roomName of told) {
      owed.add(roomName)
    }
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
      if (!room.name?.startsWith('group-')) {
        continue
      }
      seen.add(room.name)
      const groupId = groupIdFromRoomName(room.name)
      if (!groupId) {
        owed.delete(room.name)
        continue
      }
      // room.numParticipants is a number; gracefully coerce in case of bigint
      const count = Number(room.numParticipants ?? 0) || 0
      if (lastSeenCounts.get(room.name) !== count || told.has(room.name)) {
        lastSeenCounts.set(room.name, count)
        await serverPubsub.publish(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED, { groupId, count })
      }
      owed.delete(room.name)
    }
    // Rooms that disappeared from LiveKit's list since the last poll — emit a
    // final count: 0 so the badge clears even if the webhook room_finished
    // event never made it to us, then drop the entry so the map doesn't grow
    // unbounded across long-lived servers with many short-lived rooms. The same goes for a
    // room a client was told a running call for, even if this poller never saw it.
    for (const roomName of new Set([...lastSeenCounts.keys(), ...told])) {
      if (seen.has(roomName)) {
        continue
      }
      if ((lastSeenCounts.get(roomName) ?? 0) > 0 || told.has(roomName)) {
        const groupId = groupIdFromRoomName(roomName)
        // Always a group id here: only names that already yielded one are recorded in
        // lastSeenCounts (the loop above `continue`s on a falsy groupId), and the rooms a client
        // was told about are named by roomNameForGroup — so the name cannot fail to parse on the
        // way out.
        /* v8 ignore next -- unreachable: both sources only hold names with a parsable group id */
        if (groupId) {
          await serverPubsub.publish(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED, { groupId, count: 0 })
        }
      }
      lastSeenCounts.delete(roomName)
      owed.delete(roomName)
    }
  } finally {
    for (const roomName of owed) {
      markRoomTold(roomName)
    }
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
    return
  }
  if (pollTimer) {
    return
  }
  const livekitUrl = CONFIG.LIVEKIT_URL
  const apiKey = CONFIG.LIVEKIT_API_KEY
  const apiSecret = CONFIG.LIVEKIT_API_SECRET
  if (!livekitUrl || !apiKey || !apiSecret) {
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
  if (typeof initialTimer.unref === 'function') {
    initialTimer.unref()
  }
  pollTimer = setInterval(() => {
    void runTick()
  }, POLL_INTERVAL_MS)
  if (typeof pollTimer.unref === 'function') {
    pollTimer.unref()
  }
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
  takeToldRooms()
}
