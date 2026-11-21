/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Readable } from 'node:stream'

import { parse } from 'graphql'
import { Upload } from 'graphql-upload/public/index.js'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import CONFIG from '@config/index'
import Factory, { cleanDatabase } from '@db/factories'
import AddRoomDraftFile from '@graphql/queries/messaging/AddRoomDraftFile.gql'
import CreateGroupRoom from '@graphql/queries/messaging/CreateGroupRoom.gql'
import CreateMessage from '@graphql/queries/messaging/CreateMessage.gql'
import RemoveRoomDraftFile from '@graphql/queries/messaging/RemoveRoomDraftFile.gql'
import SaveRoomDraft from '@graphql/queries/messaging/SaveRoomDraft.gql'
import DeleteUser from '@graphql/queries/users/DeleteUser.gql'
import { createApolloTestSetup } from '@root/test/helpers'
import { endCallSession, joinCallSession } from '@src/livekit/callSession'

import type { attachments as Attachments } from '@graphql/resolvers/attachments/attachments'
import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { NetworkPolicy } from '@src/policy'
import type { Transaction } from 'neo4j-driver'

// What happens while a file is uploaded, within the transaction that stores it, and the address
// of every file uploaded. `vi.mock` is hoisted above the imports, so its state is too.
const uploading = vi.hoisted(() => ({
  meanwhile: null as null | ((transaction: Transaction) => Promise<void>),
  urls: [] as string[],
}))

vi.mock('@graphql/resolvers/attachments/attachments', async (importOriginal) => {
  const actual = await importOriginal<{ attachments: typeof Attachments }>()
  return {
    ...actual,
    attachments: (config: Parameters<typeof actual.attachments>[0]) => {
      const real = actual.attachments(config)
      return {
        ...real,
        add: async (...args: Parameters<typeof real.add>) => {
          const file = await real.add(...args)
          uploading.urls.push(file.url)
          const transaction = args[4]?.transaction
          if (uploading.meanwhile && transaction) {
            await uploading.meanwhile(transaction)
          }
          return file
        },
      }
    },
  }
})

// What somebody has begun to write in a chat and not sent is kept per person and per chat, on
// their edge to the room. These hold that it stays theirs alone, that sending ends it, that a
// direct conversation without a message is opened for it without showing up for the other one,
// that it goes with the call whose chat it was written in, and that its files go along with it.

const DESCRIPTION =
  'A descriptive paragraph for draft test groups that is comfortably longer than the 100 character minimum required by the Group model schema.'

const roomDraft = parse(`query ($id: ID) { Room(id: $id) { id draft } }`)
const roomList = parse(`{ Room { id draft } }`)
const roomDraftFiles = parse(
  `query ($id: ID) { Room(id: $id) { id draftFiles { url name type } } }`,
)
const roomWithUser = parse(`query ($userId: ID) { Room(userId: $userId) { id draft } }`)
const userData = parse(`
  query ($id: ID) {
    userData(id: $id) {
      chatDrafts {
        roomId
        roomName
        isCallRoom
        text
        files {
          name
        }
        updatedAt
      }
    }
  }
`)

let setup: ApolloTestSetup
let authenticatedUser: Context['user']
let anna: Context['user']
let ben: Context['user']
let carl: Context['user']
let directRoomId: string
let policy: Partial<NetworkPolicy>

const as = (user: Context['user']) => {
  authenticatedUser = user
}

const save = async (variables: { roomId?: string; userId?: string; text?: string | null }) =>
  setup.mutate({ mutation: SaveRoomDraft, variables })

const send = async (variables: { roomId?: string; userId?: string; content: string }) =>
  setup.mutate({ mutation: CreateMessage, variables })

// A file as the upload of a form would hand it over.
const aFile = (name: string) => {
  const stream = Readable.from(name)
  const upload = new Upload()
  upload.resolve({
    createReadStream: () => stream,
    stream,
    filename: name,
    encoding: '7bit',
    mimetype: 'text/plain',
  })
  return { upload, name, type: 'text/plain' }
}

const attach = async (variables: { roomId?: string; userId?: string }, name: string) =>
  setup.mutate({ mutation: AddRoomDraftFile, variables: { ...variables, file: aFile(name) } })

const detach = async (variables: { roomId?: string; userId?: string; url: string }) =>
  setup.mutate({ mutation: RemoveRoomDraftFile, variables })

const draftFilesIn = async (roomId: string) => {
  const { data, errors } = await setup.query({ query: roomDraftFiles, variables: { id: roomId } })

  expect(errors).toBeUndefined()

  return data.Room[0]?.draftFiles.map((file: { name: string }) => file.name)
}

const fileCount = async () => {
  const result = await setup.database.driver
    .session()
    .run('MATCH (file:File) RETURN count(file) AS count')
  return result.records[0].get('count').toNumber()
}

// Whether the storage still serves the file: it is uploaded readable for everybody.
const stored = async (url: string) => (await fetch(url)).ok

const draftIn = async (roomId: string) => {
  const { data, errors } = await setup.query({ query: roomDraft, variables: { id: roomId } })

  expect(errors).toBeUndefined()

  return data.Room[0]?.draft
}

const listedRoomIds = async () => {
  const { data, errors } = await setup.query({ query: roomList })

  expect(errors).toBeUndefined()

  return data.Room.map((room: { id: string }) => room.id)
}

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({
    context: () => ({
      authenticatedUser,
      policy,
      // Draft files go to the storage of CONFIG, as a message's do (messages.ts), while deleting
      // an account goes through the context's: one storage client serves both.
      config: {
        AWS_ENDPOINT: CONFIG.AWS_ENDPOINT,
        AWS_ACCESS_KEY_ID: CONFIG.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: CONFIG.AWS_SECRET_ACCESS_KEY,
      },
    }),
  })
})

beforeEach(async () => {
  policy = {}
  uploading.meanwhile = null
  uploading.urls = []
  await cleanDatabase()
  const [annaUser, benUser, carlUser] = await Promise.all([
    Factory.build('user', { id: 'anna', name: 'Anna' }),
    Factory.build('user', { id: 'ben', name: 'Ben' }),
    Factory.build('user', { id: 'carl', name: 'Carl' }),
  ])
  ;[anna, ben, carl] = await Promise.all([annaUser.toJson(), benUser.toJson(), carlUser.toJson()])
  // Anna and Ben talk directly.
  as(anna)
  const sent = await send({ userId: 'ben', content: 'Hello Ben' })
  directRoomId = sent.data.CreateMessage.room.id
})

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('SaveRoomDraft', () => {
  it('keeps the draft for the one writing it, and for nobody else', async () => {
    as(anna)

    const { data, errors } = await save({ roomId: directRoomId, text: 'Half a thought' })

    expect(errors).toBeUndefined()
    expect(data.SaveRoomDraft).toEqual({
      id: directRoomId,
      roomId: directRoomId,
      draft: 'Half a thought',
    })
    await expect(draftIn(directRoomId)).resolves.toBe('Half a thought')

    as(ben)

    await expect(draftIn(directRoomId)).resolves.toBeNull()
  })

  it('keeps one draft per person in the same room', async () => {
    as(anna)
    await save({ roomId: directRoomId, text: 'Anna writes' })
    as(ben)
    await save({ roomId: directRoomId, text: 'Ben writes' })

    await expect(draftIn(directRoomId)).resolves.toBe('Ben writes')

    as(anna)

    await expect(draftIn(directRoomId)).resolves.toBe('Anna writes')
  })

  it('takes the draft away for an empty text, or one of blanks only', async () => {
    as(anna)
    await save({ roomId: directRoomId, text: 'Something' })

    await save({ roomId: directRoomId, text: '  \n ' })

    await expect(draftIn(directRoomId)).resolves.toBeNull()

    await save({ roomId: directRoomId, text: 'Again' })
    await save({ roomId: directRoomId, text: null })

    await expect(draftIn(directRoomId)).resolves.toBeNull()
  })

  it('keeps the text as typed, but no longer than a message', async () => {
    as(anna)

    await save({ roomId: directRoomId, text: '  indented\n' })

    await expect(draftIn(directRoomId)).resolves.toBe('  indented\n')

    await save({ roomId: directRoomId, text: 'x'.repeat(2100) })

    await expect(draftIn(directRoomId)).resolves.toBe('x'.repeat(2000))
  })

  it('keeps none of blanks only once cut to the length of a message', async () => {
    as(anna)
    await save({ roomId: directRoomId, text: 'Something' })

    await save({ roomId: directRoomId, text: `${' '.repeat(2000)}x` })

    await expect(draftIn(directRoomId)).resolves.toBeNull()
  })

  it('opens no direct conversation besides the room named', async () => {
    as(anna)

    const { data } = await save({ roomId: directRoomId, userId: 'carl', text: 'For Ben' })

    expect(data.SaveRoomDraft.id).toBe(directRoomId)

    const found = await setup.query({ query: roomWithUser, variables: { userId: 'carl' } })

    expect(found.data.Room).toEqual([])
  })

  it('ends with the message sent in the room', async () => {
    as(anna)
    await save({ roomId: directRoomId, text: 'Almost sent' })

    await send({ roomId: directRoomId, content: 'Almost sent' })

    await expect(draftIn(directRoomId)).resolves.toBeNull()
  })

  it('keeps nothing in a room the user does not chat in', async () => {
    as(carl)

    const { data, errors } = await save({ roomId: directRoomId, text: 'Let me in' })

    expect(errors).toBeUndefined()
    expect(data.SaveRoomDraft).toBeNull()

    as(anna)

    await expect(draftIn(directRoomId)).resolves.toBeNull()
  })

  it('asks for a room or a user', async () => {
    as(anna)

    const { errors } = await save({ text: 'To whom?' })

    expect(errors?.[0].message).toBe('Name either a chat or the user to chat with.')
  })

  it('opens no direct conversation with oneself', async () => {
    as(anna)

    const { errors } = await save({ userId: 'anna', text: 'Dear me' })

    expect(errors?.[0].message).toBe('You cannot create a chat with yourself.')
  })

  describe('with files attached', () => {
    it('keeps them for the one writing, and for nobody else', async () => {
      as(anna)

      const { data, errors } = await attach({ roomId: directRoomId }, 'notes.txt')

      expect(errors).toBeUndefined()
      expect(data.AddRoomDraftFile).toEqual({
        url: expect.any(String),
        name: 'notes.txt',
        type: 'text/plain',
      })
      await expect(draftFilesIn(directRoomId)).resolves.toEqual(['notes.txt'])

      as(ben)

      await expect(draftFilesIn(directRoomId)).resolves.toEqual([])
    })

    it('keeps them when the text is taken away', async () => {
      as(anna)
      await save({ roomId: directRoomId, text: 'See attached' })
      await attach({ roomId: directRoomId }, 'notes.txt')

      await save({ roomId: directRoomId, text: '' })

      await expect(draftIn(directRoomId)).resolves.toBeNull()
      await expect(draftFilesIn(directRoomId)).resolves.toEqual(['notes.txt'])
    })

    it('takes one away by its address, from the storage too', async () => {
      as(anna)
      const first = await attach({ roomId: directRoomId }, 'first.txt')
      await attach({ roomId: directRoomId }, 'second.txt')

      const second = (
        await setup.query({ query: roomDraftFiles, variables: { id: directRoomId } })
      ).data.Room[0].draftFiles.find((file: { name: string }) => file.name === 'second.txt').url

      const { data, errors } = await detach({
        roomId: directRoomId,
        url: first.data.AddRoomDraftFile.url,
      })

      expect(errors).toBeUndefined()
      expect(data.RemoveRoomDraftFile).toBe(true)
      await expect(draftFilesIn(directRoomId)).resolves.toEqual(['second.txt'])
      await expect(fileCount()).resolves.toBe(1)
      // In the storage as well: the first is gone, the second is still there.
      await expect(stored(first.data.AddRoomDraftFile.url)).resolves.toBe(false)
      await expect(stored(second)).resolves.toBe(true)
    })

    it("takes nobody else's away", async () => {
      as(anna)
      const { data: added } = await attach({ roomId: directRoomId }, 'notes.txt')
      as(ben)

      const { data } = await detach({ roomId: directRoomId, url: added.AddRoomDraftFile.url })

      expect(data.RemoveRoomDraftFile).toBe(false)

      as(anna)

      await expect(draftFilesIn(directRoomId)).resolves.toEqual(['notes.txt'])
    })

    it('keeps nothing in a room the user does not chat in', async () => {
      as(carl)

      const { data, errors } = await attach({ roomId: directRoomId }, 'notes.txt')

      expect(errors).toBeUndefined()
      expect(data.AddRoomDraftFile).toBeNull()
      await expect(fileCount()).resolves.toBe(0)
    })

    it('opens a direct conversation for them, listed while one is left', async () => {
      as(anna)

      await attach({ userId: 'carl' }, 'notes.txt')
      const found = await setup.query({ query: roomWithUser, variables: { userId: 'carl' } })
      const roomId = found.data.Room[0].id

      await expect(listedRoomIds()).resolves.toContain(roomId)
      await expect(draftFilesIn(roomId)).resolves.toEqual(['notes.txt'])

      const [url] = (
        await setup.query({ query: roomDraftFiles, variables: { id: roomId } })
      ).data.Room[0].draftFiles.map((file: { url: string }) => file.url)
      await detach({ userId: 'carl', url })

      await expect(listedRoomIds()).resolves.not.toContain(roomId)
    })

    describe('when the message is sent', () => {
      it('takes those named over, without another upload, and drops the rest', async () => {
        as(anna)
        await save({ roomId: directRoomId, text: 'Two files' })
        const kept = await attach({ roomId: directRoomId }, 'kept.txt')
        await attach({ roomId: directRoomId }, 'dropped.txt')
        const url = kept.data.AddRoomDraftFile.url

        const sent = await setup.mutate({
          mutation: CreateMessage,
          variables: {
            roomId: directRoomId,
            content: 'Two files',
            files: [aFile('fresh.txt')],
            draftFiles: [url],
          },
        })

        expect(sent.errors).toBeUndefined()
        expect(sent.data.CreateMessage.files).toEqual([
          { url, name: 'kept.txt', type: 'text/plain' },
          { url: expect.any(String), name: 'fresh.txt', type: 'text/plain' },
        ])
        await expect(draftFilesIn(directRoomId)).resolves.toEqual([])
        await expect(draftIn(directRoomId)).resolves.toBeNull()
        // kept.txt and fresh.txt, at the message.
        await expect(fileCount()).resolves.toBe(2)
      })

      it('takes them over in the order named', async () => {
        as(anna)
        const first = await attach({ roomId: directRoomId }, 'first.txt')
        const second = await attach({ roomId: directRoomId }, 'second.txt')
        const third = await attach({ roomId: directRoomId }, 'third.txt')
        const urlOf = (result: typeof first) => result.data.AddRoomDraftFile.url

        const sent = await setup.mutate({
          mutation: CreateMessage,
          variables: {
            roomId: directRoomId,
            content: 'Backwards',
            draftFiles: [urlOf(third), urlOf(first), urlOf(second)],
          },
        })

        expect(sent.errors).toBeUndefined()
        expect(sent.data.CreateMessage.files.map((file: { name: string }) => file.name)).toEqual([
          'third.txt',
          'first.txt',
          'second.txt',
        ])
      })

      it('takes a message of draft files only', async () => {
        as(anna)
        const kept = await attach({ roomId: directRoomId }, 'kept.txt')

        const sent = await setup.mutate({
          mutation: CreateMessage,
          variables: {
            roomId: directRoomId,
            content: '',
            draftFiles: [kept.data.AddRoomDraftFile.url],
          },
        })

        expect(sent.errors).toBeUndefined()
        expect(sent.data.CreateMessage.files).toHaveLength(1)
      })

      it('takes null as no draft files named, and as the draft ending', async () => {
        as(anna)
        await save({ roomId: directRoomId, text: 'Ends' })

        const empty = await setup.mutate({
          mutation: CreateMessage,
          variables: { roomId: directRoomId, content: '', draftFiles: null },
        })

        expect(empty.errors?.[0].message).toBe('Message must have content or files.')

        const sent = await setup.mutate({
          mutation: CreateMessage,
          variables: { roomId: directRoomId, content: 'Sent', endsDraft: null },
        })

        expect(sent.errors).toBeUndefined()
        await expect(draftIn(directRoomId)).resolves.toBeNull()
      })

      it('leaves the draft as it is when sent again after failing', async () => {
        as(anna)
        const earlier = await attach({ roomId: directRoomId }, 'earlier.txt')
        await attach({ roomId: directRoomId }, 'since.txt')
        await save({ roomId: directRoomId, text: 'Written since' })

        const sent = await setup.mutate({
          mutation: CreateMessage,
          variables: {
            roomId: directRoomId,
            content: 'Sent again',
            draftFiles: [earlier.data.AddRoomDraftFile.url],
            endsDraft: false,
          },
        })

        expect(sent.data.CreateMessage.files).toEqual([
          expect.objectContaining({ name: 'earlier.txt' }),
        ])
        await expect(draftIn(directRoomId)).resolves.toBe('Written since')
        await expect(draftFilesIn(directRoomId)).resolves.toEqual(['since.txt'])
      })

      it("takes over none of anybody else's", async () => {
        as(ben)
        const bens = await attach({ roomId: directRoomId }, 'bens.txt')
        as(anna)

        const sent = await setup.mutate({
          mutation: CreateMessage,
          variables: {
            roomId: directRoomId,
            content: 'Mine',
            draftFiles: [bens.data.AddRoomDraftFile.url],
          },
        })

        expect(sent.data.CreateMessage.files).toEqual([])

        as(ben)

        await expect(draftFilesIn(directRoomId)).resolves.toEqual(['bens.txt'])
      })
    })
  })

  describe('for a direct conversation without a message yet', () => {
    it('opens one room for the pair, however many drafts come at once', async () => {
      as(anna)

      const saves = await Promise.all([
        save({ userId: 'carl', text: 'One' }),
        save({ userId: 'carl', text: 'Two' }),
        save({ userId: 'carl', text: 'Three' }),
      ])

      saves.forEach(({ errors, data }) => {
        expect(errors).toBeUndefined()
        expect(data.SaveRoomDraft).not.toBeNull()
      })
      // Counted in the database: asked for by user, a room is found once even if there are two.
      const rooms = await setup.database.driver.session().run(
        `
          MATCH (:User { id: 'anna' })-[:CHATS_IN]->(room:Room)<-[:CHATS_IN]-(:User { id: 'carl' })
          WHERE NOT (room)-[:ROOM_FOR]->()
          RETURN count(room) AS count
        `,
      )

      expect(rooms.records[0].get('count').toNumber()).toBe(1)
    })

    it('opens the room for the draft, listed for the one writing only', async () => {
      as(anna)

      const { data, errors } = await save({ userId: 'carl', text: 'Dear Carl' })

      expect(errors).toBeUndefined()

      const roomId = data.SaveRoomDraft.id

      expect(data.SaveRoomDraft.draft).toBe('Dear Carl')
      await expect(listedRoomIds()).resolves.toContain(roomId)

      const found = await setup.query({ query: roomWithUser, variables: { userId: 'carl' } })

      expect(found.data.Room).toEqual([{ id: roomId, draft: 'Dear Carl' }])

      // Nothing was said to Carl yet.
      as(carl)

      await expect(listedRoomIds()).resolves.not.toContain(roomId)
    })

    it('finds the room again, and the first message is sent in it', async () => {
      as(anna)
      const first = await save({ userId: 'carl', text: 'Dear' })
      const second = await save({ userId: 'carl', text: 'Dear Carl' })

      expect(second.data.SaveRoomDraft.id).toBe(first.data.SaveRoomDraft.id)

      const sent = await send({ userId: 'carl', content: 'Dear Carl' })

      expect(sent.data.CreateMessage.room.id).toBe(first.data.SaveRoomDraft.id)
      await expect(draftIn(first.data.SaveRoomDraft.id)).resolves.toBeNull()

      as(carl)

      await expect(listedRoomIds()).resolves.toContain(first.data.SaveRoomDraft.id)
    })

    it('is no longer listed once the draft is taken away again', async () => {
      as(anna)
      const { data } = await save({ userId: 'carl', text: 'Dear Carl' })

      await save({ userId: 'carl', text: '' })

      await expect(listedRoomIds()).resolves.not.toContain(data.SaveRoomDraft.id)
    })

    it('opens no room to take nothing away', async () => {
      as(anna)

      const { data, errors } = await save({ userId: 'carl', text: '' })

      expect(errors).toBeUndefined()
      expect(data.SaveRoomDraft).toBeNull()

      const found = await setup.query({ query: roomWithUser, variables: { userId: 'carl' } })

      expect(found.data.Room).toEqual([])
    })
  })

  describe("in a group's chat while groups are switched off", () => {
    it('is not kept, and says why', async () => {
      await Factory.build(
        'group',
        { id: 'knit', name: 'Knitting Group', template: 'public', description: DESCRIPTION },
        { ownerId: 'anna' },
      )
      as(anna)
      const created = await setup.mutate({
        mutation: CreateGroupRoom,
        variables: { groupId: 'knit' },
      })

      expect(created.errors).toBeUndefined()

      const groupRoomId = created.data.CreateGroupRoom.id
      policy = { groupsEnabled: false }

      const { errors } = await save({ roomId: groupRoomId, text: 'Not now' })

      expect(errors?.[0].extensions?.errorCode).toBe('GROUPS_FEATURE_DISABLED')

      const drafts = await setup.database.driver
        .session()
        .run(
          'MATCH (:User)-[chatsIn:CHATS_IN]->(:Room { id: $id }) RETURN chatsIn.draft AS draft',
          {
            id: groupRoomId,
          },
        )

      expect(drafts.records.map((record) => record.get('draft'))).toEqual([null])
    })
  })

  describe('in the conference chat of a video call', () => {
    let callRoomId: string

    beforeEach(async () => {
      await Factory.build(
        'group',
        { id: 'yoga', name: 'Yoga Group', template: 'public', description: DESCRIPTION },
        { ownerId: 'anna' },
      )
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

    it('keeps no file whose upload outlasted the call, in the storage neither', async () => {
      as(anna)
      // The call ends while the file is being uploaded.
      uploading.meanwhile = async (transaction) => {
        await transaction.run(
          `MATCH (call:VideoCallSession { livekitSid: 'RM_1' }) SET call.endedAt = toString(datetime())`,
        )
      }

      const { data, errors } = await attach({ roomId: callRoomId }, 'late.txt')

      expect(errors).toBeUndefined()
      expect(data.AddRoomDraftFile).toBeNull()
      expect(uploading.urls).toHaveLength(1)
      await expect(stored(uploading.urls[0])).resolves.toBe(false)
      await expect(fileCount()).resolves.toBe(0)
    })

    it('says so when the upload fails for another reason', async () => {
      as(anna)
      uploading.meanwhile = async () => Promise.reject(new Error('Storage unwell'))

      const { data, errors } = await attach({ roomId: callRoomId }, 'unlucky.txt')

      expect(errors?.[0].message).toBe('Storage unwell')
      expect(data?.AddRoomDraftFile ?? null).toBeNull()
      await expect(fileCount()).resolves.toBe(0)
    })

    it('is kept while the call runs', async () => {
      as(anna)

      await save({ roomId: callRoomId, text: 'In the call' })

      await expect(draftIn(callRoomId)).resolves.toBe('In the call')
    })

    it('goes with the call, and none is kept once it is over', async () => {
      as(anna)
      await save({ roomId: callRoomId, text: 'In the call' })
      as(ben)
      await save({ roomId: callRoomId, text: 'Me too' })
      await save({ roomId: directRoomId, text: 'Not in the call' })

      await attach({ roomId: callRoomId }, 'slides.txt')

      await endCallSession(setup.database.driver, 'RM_1')

      await expect(draftIn(callRoomId)).resolves.toBeNull()
      await expect(draftFilesIn(callRoomId)).resolves.toEqual([])
      await expect(fileCount()).resolves.toBe(0)
      await expect(draftIn(directRoomId)).resolves.toBe('Not in the call')

      as(anna)

      await expect(draftIn(callRoomId)).resolves.toBeNull()

      const { data, errors } = await save({ roomId: callRoomId, text: 'Too late' })

      expect(errors).toBeUndefined()
      expect(data.SaveRoomDraft).toBeNull()
      await expect(draftIn(callRoomId)).resolves.toBeNull()
    })
  })
})

describe('the export of the user data', () => {
  it('names each unsent draft as a draft, with its chat', async () => {
    as(anna)
    await save({ roomId: directRoomId, text: 'For Ben' })
    await attach({ roomId: directRoomId }, 'for-ben.txt')
    await save({ userId: 'carl', text: 'For Carl' })

    const { data, errors } = await setup.query({ query: userData, variables: { id: 'anna' } })

    expect(errors).toBeUndefined()
    expect(data.userData.chatDrafts).toEqual([
      {
        roomId: directRoomId,
        roomName: 'Ben',
        isCallRoom: false,
        text: 'For Ben',
        files: [{ name: 'for-ben.txt' }],
        updatedAt: expect.any(String),
      },
      {
        roomId: expect.any(String),
        roomName: 'Carl',
        isCallRoom: false,
        text: 'For Carl',
        files: [],
        updatedAt: expect.any(String),
      },
    ])
  })

  it("holds none of anybody else's drafts", async () => {
    as(ben)
    await save({ roomId: directRoomId, text: 'For Anna' })
    as(anna)

    const { data } = await setup.query({ query: userData, variables: { id: 'anna' } })

    expect(data.userData.chatDrafts).toEqual([])
  })
})

describe('the deletion of the account', () => {
  it('takes the drafts with it, files and all', async () => {
    as(anna)
    await save({ roomId: directRoomId, text: 'Never sent' })
    await attach({ roomId: directRoomId }, 'notes.txt')

    const { errors } = await setup.mutate({ mutation: DeleteUser, variables: { id: 'anna' } })

    expect(errors).toBeUndefined()
    await expect(fileCount()).resolves.toBe(0)

    const edge = await setup.database.driver
      .session()
      .run('MATCH (:User { id: $id })-[chatsIn:CHATS_IN]->(:Room) RETURN chatsIn.draft AS draft', {
        id: 'anna',
      })

    expect(edge.records.map((record) => record.get('draft'))).toEqual([null])
  })
})
