// Moderating a running video call. Who moderates is kept on the call's session
// (livekit/moderation.ts); these resolvers decide who may do what, carry it out on the media
// server, and tell those it concerns.
//
// Two kinds of acts, told apart on purpose:
// - LIGHT: muting, switching off a camera, ending a screen share, giving the floor. The person
//   can undo it at once, and sees who did it. Any moderator may do it to anybody — also to
//   another moderator or somebody above them in the group, who may have stepped away from a
//   call that can hear their phone.
// - HEAVY: removing from the call, taking the moderation away. These follow the group's ranks
//   (groupRole/authority.ts): nobody removes somebody who outranks them, a moderator is removed
//   or loses the moderation only to somebody who outranks them, and the group's owner is never
//   removed.
import { Errors } from '@graphql/errorRegistry'
import { AppError } from '@graphql/errors'
import { dominatesInGroup } from '@src/groupRole/authority'
import { OWNER_ROLE } from '@src/groupRole/types'
import {
  SOURCES,
  identitiesOf,
  markRemoved,
  moderates,
  muteTracks,
  notify,
  presentUsers,
  readModeration,
  removeConnections,
  setEveryoneModerates,
  setModerator,
  setSpeaker,
  setSpeakers,
  successorOf,
} from '@src/livekit/moderation'
import { connectionsOf, settleAndPublishModeration } from '@src/livekit/moderationService'
import { liveKitConfigOf, roomNameForGroup, roomServiceFor } from '@src/livekit/rooms'

import type { Context } from '@src/context'
import type { GroupAuthorization } from '@src/groupRole/requestScope'
import type { ModerationNoticeType, ModerationState } from '@src/livekit/moderation'

type Action = 'MUTE_MICROPHONE' | 'DISABLE_CAMERA' | 'STOP_SCREEN_SHARE' | 'REMOVE'

const LIGHT = new Map<
  Action,
  { sources: (typeof SOURCES)[keyof typeof SOURCES]; notice: ModerationNoticeType }
>([
  ['MUTE_MICROPHONE', { sources: SOURCES.microphone, notice: 'microphoneMuted' }],
  ['DISABLE_CAMERA', { sources: SOURCES.camera, notice: 'cameraOff' }],
  ['STOP_SCREEN_SHARE', { sources: SOURCES.screenShare, notice: 'screenShareStopped' }],
])

// Who is asking. The shield lets nobody unauthenticated through to these resolvers.
const userOf = (context: Context) => context.user as NonNullable<Context['user']>

// The running call as the caller sees it. Only somebody in it may act on it: the media server
// says who that is, and the session must be open — it is what the moderation lives on.
const callFor = async (context: Context, groupId: string) => {
  const me = userOf(context)
  const config = liveKitConfigOf(context.config)
  /* v8 ignore next 3 -- unreachable: the videoConference policy requires the LiveKit config */
  if (!config) {
    throw new AppError(Errors.VIDEO_CALL_MODERATION_NOT_IN_CALL)
  }
  const connections = await connectionsOf(config, groupId)
  const present = presentUsers(connections)
  const state = present.includes(me.id) ? await readModeration(context.driver, groupId) : null
  if (!state) {
    throw new AppError(Errors.VIDEO_CALL_MODERATION_NOT_IN_CALL)
  }
  return {
    client: roomServiceFor(config),
    roomName: roomNameForGroup(groupId),
    connections,
    present,
    state,
  }
}

const requireModerator = (state: ModerationState, userId: string) => {
  if (!moderates(state, userId)) {
    throw new AppError(Errors.VIDEO_CALL_MODERATION_NOT_MODERATOR)
  }
}

const requirePresent = (present: string[], userId: string) => {
  if (!present.includes(userId)) {
    throw new AppError(Errors.VIDEO_CALL_MODERATION_PARTICIPANT_NOT_IN_CALL)
  }
}

// Where the caller stands to the target in the group.
// Exported for the spec: the network admin's standing above every member is set by an elevation,
// which is the business of another module's tests.
export const standing = async (context: Context, groupId: string, targetId: string) => {
  // Never null: the shield has let the caller through on a right in this group.
  const actor = (await context.groupAuthorization.forGroup(groupId)) as GroupAuthorization
  const target = await context.groupAuthorization.memberPermissions(groupId, targetId)
  const above = actor.outranksMembers
  return {
    outranks: above || dominatesInGroup(actor.effective, target),
    outranked: !above && dominatesInGroup(target, actor.effective),
    isOwner:
      (await context.groupAuthorization.forGroupMemberRole(groupId, targetId)) === OWNER_ROLE,
    mayModerateGroupCalls: actor.has('group.videoCall.moderate'),
  }
}

type Standing = Awaited<ReturnType<typeof standing>>

type Call = Awaited<ReturnType<typeof callFor>>

// Gives the caller's moderation to somebody else in the call: the one named, if they are there,
// else whom it would go to anyway (successorOf) — never back to the caller. Whoever had it taken
// away is passed over while anybody else is left.
const handOn = async (
  context: Context,
  groupId: string,
  { client, roomName, connections, present, state }: Call,
  toUserId?: string | null,
) => {
  const me = userOf(context)
  const others = present.filter((userId) => userId !== me.id && !state.removedIds.includes(userId))
  const eligible = others.filter((userId) => !state.revokedIds.includes(userId))
  const successor =
    toUserId && others.includes(toUserId)
      ? toUserId
      : await successorOf(context.driver, groupId, eligible.length > 0 ? eligible : others)
  if (successor && !state.moderatorIds.includes(successor)) {
    await setModerator(context.driver, state.sessionId, successor, { moderator: true })
    await notify(
      client,
      roomName,
      { type: 'moderator', reason: 'handedOver', by: me.name },
      identitiesOf(connections, [successor]),
    )
  }
}

// Removing: never the owner; a moderator only by somebody above them; anybody else by somebody
// they do not outrank.
const mayRemove = (
  state: ModerationState,
  targetId: string,
  { outranks, outranked, isOwner }: Standing,
) => !isOwner && (moderates(state, targetId) ? outranks : !outranked)

const mayRevoke = (state: ModerationState, targetId: string, { outranks }: Standing) =>
  state.moderatorIds.includes(targetId) && outranks

export default {
  Query: {
    videoCallModerationRights: async (
      _root,
      { groupId, userId }: { groupId: string; userId: string },
      context: Context,
    ) => {
      const me = userOf(context)
      const { state, present } = await callFor(context, groupId)
      if (userId === me.id || !present.includes(userId) || !moderates(state, me.id)) {
        return { userId, remove: false, revokeModeration: false }
      }
      const position = await standing(context, groupId, userId)
      return {
        userId,
        remove: mayRemove(state, userId, position),
        revokeModeration: mayRevoke(state, userId, position),
      }
    },
    videoCallModerationSuccessor: async (
      _root,
      { groupId }: { groupId: string },
      context: Context,
    ) => {
      const me = userOf(context)
      const { state, present } = await callFor(context, groupId)
      const others = present.filter(
        (userId) => userId !== me.id && !state.removedIds.includes(userId),
      )
      const eligible = others.filter((userId) => !state.revokedIds.includes(userId))
      return successorOf(context.driver, groupId, eligible.length > 0 ? eligible : others)
    },
  },
  Mutation: {
    moderateVideoCallParticipant: async (
      _root,
      { groupId, userId, action }: { groupId: string; userId: string; action: Action },
      context: Context,
    ) => {
      const me = userOf(context)
      const { client, roomName, connections, present, state } = await callFor(context, groupId)
      requireModerator(state, me.id)
      requirePresent(present, userId)
      const theirs = connections.filter((connection) => connection.userId === userId)
      if (action === 'REMOVE') {
        if (userId === me.id) {
          throw new AppError(Errors.VIDEO_CALL_MODERATION_OUTRANKED)
        }
        const position = await standing(context, groupId, userId)
        if (position.isOwner) {
          throw new AppError(Errors.VIDEO_CALL_MODERATION_OWNER)
        }
        if (!mayRemove(state, userId, position)) {
          throw new AppError(Errors.VIDEO_CALL_MODERATION_OUTRANKED)
        }
        // Told first: once removed, nothing reaches them any more.
        await notify(
          client,
          roomName,
          { type: 'removed', by: me.name },
          identitiesOf(theirs, [userId]),
        )
        await markRemoved(context.driver, state.sessionId, userId)
        await removeConnections(client, roomName, theirs)
      } else {
        // Every action but REMOVE is in the table; the schema's enum allows no other.
        const { sources, notice } = LIGHT.get(action) as NonNullable<ReturnType<typeof LIGHT.get>>
        await muteTracks(client, roomName, theirs, sources)
        if (userId !== me.id) {
          await notify(
            client,
            roomName,
            { type: notice, by: me.name },
            identitiesOf(theirs, [userId]),
          )
        }
      }
      await settleAndPublishModeration(context, groupId)
      return true
    },
    muteAllInVideoCall: async (
      _root,
      {
        groupId,
        exceptUserIds,
        floorUserIds,
      }: { groupId: string; exceptUserIds: string[]; floorUserIds: string[] },
      context: Context,
    ) => {
      const me = userOf(context)
      const { client, roomName, connections, present, state } = await callFor(context, groupId)
      requireModerator(state, me.id)
      const speakers = floorUserIds.filter((userId) => present.includes(userId))
      const spared = new Set([...exceptUserIds, ...speakers])
      const muted = present.filter((userId) => !spared.has(userId))
      const affected = connections.filter(
        (connection) => connection.userId && muted.includes(connection.userId),
      )
      await muteTracks(client, roomName, affected, SOURCES.microphone)
      await setSpeakers(context.driver, state.sessionId, speakers)
      const others = muted.filter((userId) => userId !== me.id)
      await notify(
        client,
        roomName,
        { type: 'microphoneMuted', by: me.name },
        identitiesOf(connections, others),
      )
      const newSpeakers = speakers.filter(
        (userId) => userId !== me.id && !state.speakerIds.includes(userId),
      )
      await notify(
        client,
        roomName,
        { type: 'floor', by: me.name },
        identitiesOf(connections, newSpeakers),
      )
      await settleAndPublishModeration(context, groupId)
      return muted.length
    },
    setVideoCallModerator: async (
      _root,
      { groupId, userId, moderator }: { groupId: string; userId: string; moderator: boolean },
      context: Context,
    ) => {
      const me = userOf(context)
      const call = await callFor(context, groupId)
      const { client, roomName, connections, present, state } = call
      if (userId === me.id) {
        // One's own: giving it up is always allowed; taking it is what takeOver is for.
        if (!moderator && state.moderatorIds.includes(userId)) {
          // Handed on to somebody else first: left to the automatic, the one who has been in
          // the call longest would often be the very one giving it up.
          await handOn(context, groupId, call)
          await setModerator(context.driver, state.sessionId, userId, { moderator: false })
          await settleAndPublishModeration(context, groupId)
        }
        return true
      }
      requireModerator(state, me.id)
      requirePresent(present, userId)
      const position = await standing(context, groupId, userId)
      if (moderator) {
        if (state.revokedIds.includes(userId) && !position.mayModerateGroupCalls) {
          throw new AppError(Errors.VIDEO_CALL_MODERATION_OUTRANKED)
        }
        if (!state.moderatorIds.includes(userId)) {
          await setModerator(context.driver, state.sessionId, userId, { moderator: true })
          await notify(
            client,
            roomName,
            { type: 'moderator', reason: 'appointed', by: me.name },
            identitiesOf(connections, [userId]),
          )
        }
      } else if (state.moderatorIds.includes(userId)) {
        if (!mayRevoke(state, userId, position)) {
          throw new AppError(Errors.VIDEO_CALL_MODERATION_OUTRANKED)
        }
        await setModerator(context.driver, state.sessionId, userId, {
          moderator: false,
          revoked: true,
        })
        await notify(
          client,
          roomName,
          { type: 'moderationRevoked', by: me.name },
          identitiesOf(connections, [userId]),
        )
      }
      await settleAndPublishModeration(context, groupId)
      return true
    },
    setVideoCallEveryoneModerates: async (
      _root,
      { groupId, enabled }: { groupId: string; enabled: boolean },
      context: Context,
    ) => {
      const me = userOf(context)
      const { client, roomName, state } = await callFor(context, groupId)
      if (enabled) {
        requireModerator(state, me.id)
      } else if (!state.moderatorIds.includes(me.id)) {
        // Whoever moderates only because everybody does cannot end that for the others.
        const actor = (await context.groupAuthorization.forGroup(groupId)) as GroupAuthorization
        if (!actor.has('group.videoCall.moderate')) {
          throw new AppError(Errors.VIDEO_CALL_MODERATION_NOT_MODERATOR)
        }
      }
      if (state.everyoneModerates !== enabled) {
        await setEveryoneModerates(context.driver, state.sessionId, enabled)
        await notify(client, roomName, {
          type: enabled ? 'everyoneModerates' : 'everyoneModeratesOff',
          by: me.name,
        })
      }
      await settleAndPublishModeration(context, groupId)
      return true
    },
    takeOverVideoCallModeration: async (
      _root,
      { groupId }: { groupId: string },
      context: Context,
    ) => {
      const me = userOf(context)
      const { client, roomName, connections, state } = await callFor(context, groupId)
      if (!state.moderatorIds.includes(me.id)) {
        await setModerator(context.driver, state.sessionId, me.id, { moderator: true })
        await notify(
          client,
          roomName,
          { type: 'moderationTakenOver', by: me.name },
          identitiesOf(connections, state.moderatorIds),
        )
      }
      await settleAndPublishModeration(context, groupId)
      return true
    },
    setVideoCallFloor: async (
      _root,
      { groupId, userId, floor }: { groupId: string; userId: string; floor: boolean },
      context: Context,
    ) => {
      const me = userOf(context)
      const { client, roomName, connections, present, state } = await callFor(context, groupId)
      requireModerator(state, me.id)
      requirePresent(present, userId)
      if (floor !== state.speakerIds.includes(userId)) {
        await setSpeaker(context.driver, state.sessionId, userId, floor)
        if (floor && userId !== me.id) {
          await notify(
            client,
            roomName,
            { type: 'floor', by: me.name },
            identitiesOf(connections, [userId]),
          )
        }
      }
      await settleAndPublishModeration(context, groupId)
      return true
    },
    handOverVideoCallModeration: async (
      _root,
      {
        groupId,
        toUserId,
        everyone,
      }: { groupId: string; toUserId?: string | null; everyone?: boolean | null },
      context: Context,
    ) => {
      const me = userOf(context)
      const { client, roomName, connections, present, state } = await callFor(context, groupId)
      if (!state.moderatorIds.includes(me.id)) {
        // Nothing to hand on; for one who moderates because everybody does, it stays that way.
        return true
      }
      if (everyone) {
        if (!state.everyoneModerates) {
          await setEveryoneModerates(context.driver, state.sessionId, true)
          await notify(client, roomName, { type: 'everyoneModerates', by: me.name })
        }
      } else {
        await handOn(context, groupId, { client, roomName, connections, present, state }, toUserId)
      }
      await setModerator(context.driver, state.sessionId, me.id, { moderator: false })
      await settleAndPublishModeration(context, groupId)
      return true
    },
  },
}
