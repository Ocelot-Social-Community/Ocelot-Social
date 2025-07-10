/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ReadStream } from 'node:fs'
import { Readable } from 'node:stream'

import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { UserInputError } from 'apollo-server'

import Factory, { cleanDatabase } from '@db/factories'
import File from '@db/models/File'
import { CreateMessage } from '@graphql/queries/CreateMessage'
import { createRoomMutation } from '@graphql/queries/createRoomMutation'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { S3Config } from '@src/config'

import { attachments } from './attachments'

import type { FileInput } from './attachments'

const s3SendMock = jest.fn()
jest.spyOn(S3Client.prototype, 'send').mockImplementation(s3SendMock)

jest.mock('@aws-sdk/lib-storage')

const UploadMock = {
  done: () => {
    return {
      Location: 'http://your-objectstorage.com/bucket/',
    }
  },
}

;(Upload as unknown as jest.Mock).mockImplementation(() => UploadMock)

const config: S3Config = {
  AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
  AWS_BUCKET: 'AWS_BUCKET',
  AWS_ENDPOINT: 'AWS_ENDPOINT',
  AWS_REGION: 'AWS_REGION',
  IMAGOR_SECRET: 'IMAGOR_SECRET',
  S3_PUBLIC_GATEWAY: undefined,
}

let authenticatedUser
const context = () => ({ authenticatedUser, config })
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()

  const apolloSetup = createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(async () => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

/*  uploadCallback = jest.fn(
    ({ uniqueFilename }) => `http://your-objectstorage.com/bucket/${uniqueFilename}`,
  )
*/

afterEach(async () => {
  await cleanDatabase()
})

describe('delete Attachment', () => {
  const { del: deleteAttachment } = attachments(config)
  describe('given a resource with an attachment', () => {
    let user: { id: string }
    let chatPartner: { id: string }
    let file: { id: string }
    let message: { id: string }
    beforeEach(async () => {
      const u = await Factory.build('user')
      user = await u.toJson()

      const u2 = await Factory.build('user')
      chatPartner = await u2.toJson()

      authenticatedUser = user
      const { data: room } = await mutate({
        mutation: createRoomMutation(),
        variables: {
          userId: chatPartner.id,
        },
      })

      const f = await Factory.build('file', {
        url: 'http://localhost/some/file/url/',
        name: 'This is a file attached to a message',
        type: 'application/dummy',
      })
      file = await f.toJson()

      const m = await mutate({
        mutation: CreateMessage,
        variables: {
          roomId: room?.CreateRoom.id,
          content: 'test messsage',
        },
      })

      message = (m.data as any).CreateMessage // eslint-disable-line @typescript-eslint/no-explicit-any

      await database.write({
        query: `
        MATCH (message:Message {id: $message.id}), (file:File{url: $file.url})
        MERGE (message)-[:ATTACHMENT]->(file)
        `,
        variables: {
          message,
          file,
        },
      })
    })

    it('deletes `File` node', async () => {
      await expect(database.neode.all('File')).resolves.toHaveLength(1)
      await deleteAttachment(message, 'ATTACHMENT')
      await expect(database.neode.all('File')).resolves.toHaveLength(0)
    })

    describe('given a transaction parameter', () => {
      it('executes cypher statements within the transaction', async () => {
        const session = database.driver.session()
        let someString: string
        try {
          someString = await session.writeTransaction(async (transaction) => {
            await deleteAttachment(message, 'ATTACHMENT', {
              transaction,
            })
            const txResult = await transaction.run('RETURN "Hello" as result')
            const [result] = txResult.records.map((record) => record.get('result'))
            return result
          })
        } finally {
          await session.close()
        }
        await expect(database.neode.all('File')).resolves.toHaveLength(0)
        expect(someString).toEqual('Hello')
      })

      it('rolls back the transaction in case of errors', async () => {
        await expect(database.neode.all('File')).resolves.toHaveLength(1)
        const session = database.driver.session()
        try {
          await session.writeTransaction(async (transaction) => {
            await deleteAttachment(message, 'ATTACHMENT', {
              transaction,
            })
            throw new Error('Ouch!')
          })
          // eslint-disable-next-line no-catch-all/no-catch-all
        } catch (err) {
          // nothing has been deleted
          await expect(database.neode.all('File')).resolves.toHaveLength(1)
          // all good
        } finally {
          await session.close()
        }
      })
    })
  })
})

describe('add Attachment', () => {
  const { add: addAttachment } = attachments(config)
  let fileInput: FileInput
  let post: { id: string }
  beforeEach(() => {
    fileInput = {
      name: 'The name of the new attachment',
      type: 'application/any',
    }
  })

  describe('given file.upload', () => {
    beforeEach(() => {
      const file1 = Readable.from('file1')
      fileInput = {
        ...fileInput,
        // eslint-disable-next-line promise/avoid-new
        upload: new Promise((resolve) =>
          resolve({
            createReadStream: () => file1 as ReadStream,
            filename: 'file1',
            encoding: '7bit',
            mimetype: 'application/json',
          }),
        ),
      }
    })

    describe('on existing resource', () => {
      beforeEach(async () => {
        const p = await Factory.build(
          'post',
          { id: 'p99' },
          {
            author: Factory.build('user', {}, { avatar: null }),
            image: null,
          },
        )
        post = await p.toJson()
      })

      it('returns new file', async () => {
        await expect(addAttachment(post, 'ATTACHMENT', fileInput)).resolves.toMatchObject({
          updatedAt: expect.any(String),
          createdAt: expect.any(String),
          name: 'The name of the new attachment',
          type: 'application/any',
          url: 'http://your-objectstorage.com/bucket/',
        })
      })

      it('creates `:File` node', async () => {
        await expect(database.neode.all('File')).resolves.toHaveLength(0)
        await addAttachment(post, 'ATTACHMENT', fileInput)
        await expect(database.neode.all('File')).resolves.toHaveLength(1)
      })

      it('connects resource with image via given image type', async () => {
        await addAttachment(post, 'ATTACHMENT', fileInput)
        const result = await database.neode.cypher(
          `MATCH(p:Post {id: "p99"})-[:ATTACHMENT]->(f:File) RETURN f,p`,
          {},
        )
        post = database.neode
          .hydrateFirst<{ id: string }>(result, 'p', database.neode.model('Post'))
          .properties()
        const file = database.neode.hydrateFirst(result, 'f', database.neode.model('File'))
        expect(post).toBeTruthy()
        expect(file).toBeTruthy()
      })

      it('sets metadata', async () => {
        await addAttachment(post, 'ATTACHMENT', fileInput)
        const file = await database.neode.first<typeof File>('File', {}, undefined)
        await expect(file.toJson()).resolves.toMatchObject({
          name: 'The name of the new attachment',
          type: 'application/any',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          url: expect.any(String),
        })
      })

      describe('given a transaction parameter', () => {
        it('executes cypher statements within the transaction', async () => {
          const session = database.driver.session()
          try {
            await session.writeTransaction(async (transaction) => {
              const file = await addAttachment(
                post,
                'ATTACHMENT',
                fileInput,
                {},
                {
                  transaction,
                },
              )
              return transaction.run(
                `
                MATCH(file:File {url: $file.url})
                SET file.name = 'This name text gets overwritten'
                RETURN file {.*}
              `,
                { file },
              )
            })
          } finally {
            await session.close()
          }
          const file = await database.neode.first<typeof File>(
            'File',
            { name: 'This name text gets overwritten' },
            undefined,
          )
          await expect(file.toJson()).resolves.toMatchObject({
            name: 'This name text gets overwritten',
          })
        })

        it('rolls back the transaction in case of errors', async () => {
          const session = database.driver.session()
          try {
            await session.writeTransaction(async (transaction) => {
              const file = await addAttachment(post, 'ATTACHMENT', fileInput, {
                transaction,
              })
              return transaction.run('Ooops invalid cypher!', { file })
            })
            // eslint-disable-next-line no-catch-all/no-catch-all
          } catch (err) {
            // nothing has been created
            await expect(database.neode.all('File')).resolves.toHaveLength(0)
            // all good
          } finally {
            await session.close()
          }
        })
      })
    })
  })

  describe('without image.upload', () => {
    it('throws UserInputError', async () => {
      const p = await Factory.build('post', { id: 'p99' }, { image: null })
      post = await p.toJson()
      await expect(addAttachment(post, 'ATTACHMENT', fileInput)).rejects.toEqual(
        new UserInputError('Cannot find attachment for given resource'),
      )
    })
  })
})
