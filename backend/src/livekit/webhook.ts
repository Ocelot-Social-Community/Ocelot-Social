/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { raw as rawBodyParser } from 'express'
import { WebhookReceiver } from 'livekit-server-sdk'

import CONFIG from '@src/config'
import { VIDEO_CALL_PARTICIPANT_COUNT_CHANGED } from '@src/constants/subscriptions'
import { serverPubsub } from '@src/context'
import { getDriver } from '@src/db/neo4j'
import { getLiveParticipantCount, groupIdFromRoomName } from '@src/graphql/resolvers/videoCalls'
import { endCallSession } from '@src/livekit/callSession'
import { markRoomTold } from '@src/livekit/toldRooms'
import logger from '@src/logger'

import type { Express, Request, Response } from 'express'

const WEBHOOK_PATH = '/livekit/webhook'

const publishCount = async (
  livekitUrl: string,
  apiKey: string,
  apiSecret: string,
  groupId: string,
  roomName: string,
) => {
  const count = await getLiveParticipantCount(
    { LIVEKIT_URL: livekitUrl, LIVEKIT_API_KEY: apiKey, LIVEKIT_API_SECRET: apiSecret },
    roomName,
  )
  await serverPubsub.publish(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED, { groupId, count })
}

export const registerLiveKitWebhook = (app: Express) => {
  if (!CONFIG.LIVEKIT_ENABLED) {
    return
  }
  const livekitUrl = CONFIG.LIVEKIT_URL
  const apiKey = CONFIG.LIVEKIT_API_KEY
  const apiSecret = CONFIG.LIVEKIT_API_SECRET
  if (!livekitUrl || !apiKey || !apiSecret) {
    return
  }

  const receiver = new WebhookReceiver(apiKey, apiSecret)

  // LiveKit sends application/webhook+json; accept both that and application/json.
  // Raw body is required because the signature is computed over the unparsed payload.
  const rawJsonParser = rawBodyParser({
    type: ['application/webhook+json', 'application/json'],
    limit: '1mb',
  })

  const handleWebhook = async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.get('Authorization')
    if (!authHeader) {
      res.status(401).send('Missing Authorization header')
      return
    }
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf-8') : ''
    if (!rawBody) {
      res.status(400).send('Missing body')
      return
    }
    let event
    try {
      event = await receiver.receive(rawBody, authHeader)
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (err: unknown) {
      logger.warn('LiveKit webhook signature verification failed', err)
      res.status(401).send('Invalid signature')
      return
    }

    const roomName: string | undefined = event.room?.name
    const groupId = groupIdFromRoomName(roomName)
    if (!groupId || !roomName) {
      // Event from a room we don't own (no group- prefix). Acknowledge but ignore.
      res.status(204).end()
      return
    }

    const relevantEvents = new Set([
      'participant_joined',
      'participant_left',
      'room_started',
      'room_finished',
    ])
    if (event.event === 'room_finished') {
      // The call is over: its session ends, and with it writing to its conference chat. Before
      // the count below goes out: whoever was removed from the call learns with it that they
      // may join again, which holds only once the session has ended.
      // By the room's sid: a late report about one call must not end the next one, which runs
      // in a room of the same name.
      const roomSid: string | undefined = event.room?.sid
      if (roomSid) {
        try {
          await endCallSession(getDriver(), roomSid)
          // eslint-disable-next-line no-catch-all/no-catch-all
        } catch (err: unknown) {
          logger.error('Failed to end the call session of a finished LiveKit room', err)
          // Left to the poller: it asks again on its next run, by which time whatever failed
          // here may be over.
          markRoomTold(roomName)
        }
      } else {
        // Without the sid, the name alone does not tell which room is over — a newer one of
        // that name may be running, and ending its session would end its chat and drop its
        // removals. The poller can tell: a room noted as told is looked at on its next run,
        // and its sessions are ended only if the media server lists no room of that name.
        markRoomTold(roomName)
      }
    }
    if (relevantEvents.has(event.event)) {
      try {
        if (event.event === 'room_finished') {
          await serverPubsub.publish(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED, { groupId, count: 0 })
        } else {
          await publishCount(livekitUrl, apiKey, apiSecret, groupId, roomName)
        }
        // eslint-disable-next-line no-catch-all/no-catch-all
      } catch (err: unknown) {
        logger.error('Failed to publish LiveKit participant count update', err)
      }
    }
    res.status(204).end()
  }

  app.post(WEBHOOK_PATH, rawJsonParser, (req, res) => {
    // Express handlers must not return a Promise; wrap the async handler and
    // catch defensively so a thrown error never crashes the server.
    void (async () => {
      try {
        await handleWebhook(req, res)
        // eslint-disable-next-line no-catch-all/no-catch-all
      } catch (err: unknown) {
        logger.error('Unexpected LiveKit webhook handler error', err)
        if (!res.headersSent) {
          res.status(500).end()
        }
      }
    })()
  })

  logger.info(`LiveKit webhook endpoint registered at ${WEBHOOK_PATH}`)
}
