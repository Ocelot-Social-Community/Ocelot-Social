/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { parse } from 'graphql'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import JoinGroup from '@graphql/queries/groups/JoinGroup.gql'
import LeaveGroup from '@graphql/queries/groups/LeaveGroup.gql'
import CreateMessage from '@graphql/queries/messaging/CreateMessage.gql'
import Message from '@graphql/queries/messaging/Message.gql'
import UnreadRooms from '@graphql/queries/messaging/UnreadRooms.gql'
import { createApolloTestSetup } from '@root/test/helpers'
import { endCallSession, joinCallSession } from '@src/livekit/callSession'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// The conference chat of a video call is an ordinary Room, and that is exactly the risk: every
// place that takes "not a group's room" for "a direct conversation" would take it for one.
// These hold the room apart from both — in the chat list, in the unread badge, and above all
// when two people who happen to be alone in a call write each other directly.

const DESCRIPTION =
  'A descriptive paragraph for call-room test groups that is comfortably longer than the 100 character minimum required by the Group model schema.'

const roomList = parse(`{ Room { id } }`)
const roomById = parse(`
  query ($id: ID) {
    Room(id: $id) {
      id
      roomName
      isGroupRoom
      isCallRoom
      isWritable
      group {
        id
      }
    }
  }
`)
const roomWithUser = parse(`query ($userId: ID) { Room(userId: $userId) { id } }`)

let setup: ApolloTestSetup
let authenticatedUser: Context['user']
let anna: Context['user']
let ben: Context['user']
let carl: Context['user']
let callRoomId: string

const as = (user: Context['user']) => {
  authenticatedUser = user
}

const send = async (variables: { roomId?: string; userId?: string; content: string }) =>
  setup.mutate({ mutation: CreateMessage, variables })

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({ context: () => ({ authenticatedUser }) })
})

beforeEach(async () => {
  await cleanDatabase()
  const [annaUser, benUser, carlUser] = await Promise.all([
    Factory.build('user', { id: 'anna', name: 'Anna' }),
    Factory.build('user', { id: 'ben', name: 'Ben' }),
    Factory.build('user', { id: 'carl', name: 'Carl' }),
  ])
  ;[anna, ben, carl] = await Promise.all([annaUser.toJson(), benUser.toJson(), carlUser.toJson()])
  await Factory.build(
    'group',
    { id: 'yoga', name: 'Yoga Group', template: 'public', description: DESCRIPTION },
    { ownerId: 'anna' },
  )
  // Anna and Ben are in the call; Carl is not.
  const join = async (userId: string) =>
    joinCallSession(setup.database.driver, {
      groupId: 'yoga',
      userId,
      livekitRoom: 'group-yoga',
      livekitSid: 'RM_1',
      presentUserIds: ['anna', 'ben'],
    })
  callRoomId = (await join('anna')) as string
  await join('ben')
})

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('the conference chat of a video call', () => {
  it('is described as the call room of the group it takes place in', async () => {
    as(anna)

    const { data, errors } = await setup.query({ query: roomById, variables: { id: callRoomId } })

    expect(errors).toBeUndefined()
    expect(data.Room).toEqual([
      {
        id: callRoomId,
        roomName: 'Yoga Group',
        isGroupRoom: false,
        isCallRoom: true,
        isWritable: true,
        group: { id: 'yoga' },
      },
    ])
  })

  it('is not served to somebody who is not in the call', async () => {
    as(carl)

    const { data } = await setup.query({ query: roomById, variables: { id: callRoomId } })

    expect(data.Room).toEqual([])
  })

  it('takes messages from a participant and shows them to the others in the call', async () => {
    as(anna)
    const sent = await send({ roomId: callRoomId, content: 'hello call' })

    expect(sent.errors).toBeUndefined()
    expect(sent.data.CreateMessage.room.id).toBe(callRoomId)

    as(ben)
    const { data } = await setup.query({ query: Message, variables: { roomId: callRoomId } })

    expect(data.Message.map((message: { content: string }) => message.content)).toEqual([
      'hello call',
    ])
  })

  it('takes no message from somebody who is not in the call, and shows them none', async () => {
    as(anna)
    await send({ roomId: callRoomId, content: 'hello call' })

    as(carl)
    const sent = await send({ roomId: callRoomId, content: 'let me in' })
    const { data } = await setup.query({ query: Message, variables: { roomId: callRoomId } })

    expect(sent.data.CreateMessage).toBeNull()
    expect(data.Message).toEqual([])
  })

  it('does not appear in the chat list', async () => {
    as(anna)
    await send({ roomId: callRoomId, content: 'hello call' })

    as(ben)
    const { data } = await setup.query({ query: roomList })

    expect(data.Room).toEqual([])
  })

  it('does not count towards the unread badge', async () => {
    as(anna)
    await send({ roomId: callRoomId, content: 'hello call' })

    as(ben)
    const { data } = await setup.query({ query: UnreadRooms })

    expect(data.UnreadRooms).toBe(0)
  })

  describe('with two people alone in the call', () => {
    it('is not found as their direct conversation', async () => {
      as(anna)

      const { data } = await setup.query({ query: roomWithUser, variables: { userId: 'ben' } })

      expect(data.Room).toEqual([])
    })

    it('does not receive what one of them writes the other directly', async () => {
      as(anna)
      const direct = await send({ userId: 'ben', content: 'just between us' })

      expect(direct.errors).toBeUndefined()
      expect(direct.data.CreateMessage.room.id).not.toBe(callRoomId)

      const { data } = await setup.query({ query: Message, variables: { roomId: callRoomId } })

      expect(data.Message).toEqual([])
    })

    it('leaves their direct conversation to be found once it exists', async () => {
      as(anna)
      const direct = await send({ userId: 'ben', content: 'just between us' })

      const { data } = await setup.query({ query: roomWithUser, variables: { userId: 'ben' } })

      expect(data.Room).toEqual([{ id: direct.data.CreateMessage.room.id }])
    })
  })

  describe('when a participant leaves the group', () => {
    beforeEach(async () => {
      as(ben)
      await setup.mutate({ mutation: JoinGroup, variables: { groupId: 'yoga', userId: 'ben' } })
      as(anna)
      await send({ roomId: callRoomId, content: 'said in the call' })
    })

    it('still shows them the chat while they are a member', async () => {
      as(ben)

      const { data } = await setup.query({ query: Message, variables: { roomId: callRoomId } })

      expect(data.Message).toHaveLength(1)
    })

    it('shows them the chat no longer, and takes no message from them', async () => {
      as(ben)
      const left = await setup.mutate({
        mutation: LeaveGroup,
        variables: { groupId: 'yoga', userId: 'ben' },
      })

      expect(left.errors).toBeUndefined()

      const room = await setup.query({ query: roomById, variables: { id: callRoomId } })
      const messages = await setup.query({ query: Message, variables: { roomId: callRoomId } })
      const sent = await send({ roomId: callRoomId, content: 'one more thing' })

      expect(room.data.Room).toEqual([])
      expect(messages.data.Message).toEqual([])
      expect(sent.data.CreateMessage).toBeNull()
    })

    it('leaves the chat to those who stay', async () => {
      as(ben)
      await setup.mutate({ mutation: LeaveGroup, variables: { groupId: 'yoga', userId: 'ben' } })

      as(anna)
      const { data } = await setup.query({ query: Message, variables: { roomId: callRoomId } })

      expect(data.Message).toHaveLength(1)
    })
  })

  describe('once the call is over', () => {
    beforeEach(async () => {
      as(anna)
      await send({ roomId: callRoomId, content: 'before the end' })
      await endCallSession(setup.database.driver, 'RM_1')
    })

    it('says so to a participant who still writes, and stores nothing', async () => {
      as(ben)
      const sent = await send({ roomId: callRoomId, content: 'too late' })

      expect(sent.errors?.[0].message).toMatch(/video call is over/i)

      const { data } = await setup.query({ query: Message, variables: { roomId: callRoomId } })

      expect(data.Message.map((message: { content: string }) => message.content)).toEqual([
        'before the end',
      ])
    })

    it('is reported as no longer writable', async () => {
      as(ben)

      const { data } = await setup.query({ query: roomById, variables: { id: callRoomId } })

      expect(data.Room[0].isWritable).toBe(false)
    })

    it('gives nothing away to somebody who was not in the call', async () => {
      as(carl)

      const sent = await send({ roomId: callRoomId, content: 'what was said?' })

      expect(sent.errors).toBeUndefined()
      expect(sent.data.CreateMessage).toBeNull()
    })
  })
})
