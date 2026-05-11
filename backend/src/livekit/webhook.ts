/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import bodyParser from 'body-parser'
import { WebhookReceiver } from 'livekit-server-sdk'

import CONFIG from '@src/config'
import { serverPubsub } from '@src/context'
import { VIDEO_CALL_PARTICIPANT_COUNT_CHANGED } from '@src/constants/subscriptions'
import { getLiveParticipantCount, groupIdFromRoomName } from '@src/graphql/resolvers/videoCalls'
import logger from '@src/logger'

import type { Express, Request, Response } from 'express'

const WEBHOOK_PATH = '/livekit/webhook'

const publishCount = async (groupId: string, roomName: string) => {
  const count = await getLiveParticipantCount(
    CONFIG as { LIVEKIT_URL: string; LIVEKIT_API_KEY: string; LIVEKIT_API_SECRET: string },
    roomName,
  )
  await serverPubsub.publish(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED, { groupId, count })
}

export const registerLiveKitWebhook = (app: Express) => {
  if (!CONFIG.LIVEKIT_ENABLED) {
    logger.info('LiveKit disabled — webhook endpoint not registered.')
    return
  }

  const receiver = new WebhookReceiver(CONFIG.LIVEKIT_API_KEY!, CONFIG.LIVEKIT_API_SECRET!)

  // LiveKit sends application/webhook+json; accept both that and application/json.
  // Raw body is required because the signature is computed over the unparsed payload.
  const rawJsonParser = bodyParser.raw({
    type: ['application/webhook+json', 'application/json'],
    limit: '1mb',
  })

  app.post(WEBHOOK_PATH, rawJsonParser, async (req: Request, res: Response) => {
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
    } catch (err) {
      logger.warn('LiveKit webhook signature verification failed', err)
      res.status(401).send('Invalid signature')
      return
    }

    const roomName: string | undefined = event.room?.name
    const groupId = groupIdFromRoomName(roomName)
    if (!groupId) {
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
          await publishCount(groupId, roomName!)
        }
      } catch (err) {
        logger.error('Failed to publish LiveKit participant count update', err)
      }
    }
    res.status(204).end()
  })

  logger.info(`LiveKit webhook endpoint registered at ${WEBHOOK_PATH}`)
}
