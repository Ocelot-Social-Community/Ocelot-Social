/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { raw as rawBodyParser } from 'express'
import { WebhookReceiver } from 'livekit-server-sdk'

import CONFIG from '@src/config'
import { VIDEO_CALL_PARTICIPANT_COUNT_CHANGED } from '@src/constants/subscriptions'
import { serverPubsub } from '@src/context'
import { getLiveParticipantCount, groupIdFromRoomName } from '@src/graphql/resolvers/videoCalls'
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
    logger.info('LiveKit disabled — webhook endpoint not registered.')
    return
  }
  const livekitUrl = CONFIG.LIVEKIT_URL
  const apiKey = CONFIG.LIVEKIT_API_KEY
  const apiSecret = CONFIG.LIVEKIT_API_SECRET
  if (!livekitUrl || !apiKey || !apiSecret) {
    logger.info('LiveKit env vars incomplete — webhook endpoint not registered.')
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
        if (!res.headersSent) res.status(500).end()
      }
    })()
  })

  logger.info(`LiveKit webhook endpoint registered at ${WEBHOOK_PATH}`)
}
