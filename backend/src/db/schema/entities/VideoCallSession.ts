import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * One video call from the moment somebody opens it until the media server closes its room.
 *
 * The call itself lives on the media server and leaves nothing behind; this node is what the
 * database knows of it, and it is what the conference chat hangs on — the room only the
 * participants of this one call share (see livekit/callSession.ts).
 *
 * `livekitRoom` is the name of the media-server room the call runs in. It is stored rather
 * than derived so that a call does not have to belong to a group: today every call does and
 * the name is `group-<id>`, but nothing here assumes it.
 *
 * `livekitSid` is what tells one call from the next. The name is reused by every call of a
 * group; the sid is given by the media server to each room it opens, and never again.
 *
 * `endedAt` is null while the call runs. A session that is over keeps its chat, read-only.
 */
export const VideoCallSession = defineEntity({
  label: 'VideoCallSession',
  properties: {
    id: { type: 'string' },
    livekitRoom: { type: 'string' },
    livekitSid: { type: 'string' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    endedAt: { type: ['string', 'null'], pattern: ISO_DATE_TIME },
  },
  required: ['id', 'livekitRoom', 'livekitSid', 'createdAt'],
  unique: ['id', 'livekitSid'],
  indexed: ['livekitRoom'],
})
