/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import { CreateMessage } from '@graphql/queries/CreateMessage'
import { createRoomMutation } from '@graphql/queries/createRoomMutation'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

jest.mock('uuid', () => ({
  v4: () => 'df62c7bb-3810-4216-8123-057b790afbc8',
}))

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
let query: ApolloTestSetup['query']
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(() => {
  const apolloSetup = createApolloTestSetup({ context })
  query = apolloSetup.query
  mutate = apolloSetup.mutate
  database = apolloSetup.database
  server = apolloSetup.server
})

beforeEach(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

/*
 * See https://github.com/Ocelot-Social-Community/Ocelot-Social/pull/8780/ to understand why this test exists.
 */
describe('File.url', () => {
  const messageQuery = gql`
    query ($roomId: ID!) {
      Message(roomId: $roomId) {
        id
        files {
          url
        }
      }
    }
  `
  let roomId: string

  beforeEach(async () => {
    const user = await Factory.build('user', { id: 'u1' })
    await Factory.build('user', { id: 'u2' })
    authenticatedUser = await user.toJson()

    const r = await mutate({
      mutation: createRoomMutation(),
      variables: {
        userId: 'u2',
      },
    })

    const f = await Factory.build('file', {
      url: 'http://aws-endpoint.com/some/file/url',
      name: 'This is a file attached to a message',
      type: 'application/dummy',
    })
    const file = await f.toJson()

    roomId = r.data?.CreateRoom.id
    const m = await mutate({
      mutation: CreateMessage,
      variables: {
        roomId,
        content: 'I am the message',
      },
    })

    const message = (m.data as any).CreateMessage // eslint-disable-line @typescript-eslint/no-explicit-any

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

  it('returns a url', async () => {
    await expect(query({ query: messageQuery, variables: { roomId } })).resolves.toMatchObject({
      errors: undefined,
      data: {
        Message: [
          {
            id: expect.any(String),
            files: [
              {
                url: 'http://aws-endpoint.com/some/file/url?random=df62c7bb-3810-4216-8123-057b790afbc8',
              },
            ],
          },
        ],
      },
    })
  })
})

describe('Image.url', () => {
  const currentUserQuery = gql`
    {
      currentUser {
        id
        avatar {
          url
        }
      }
    }
  `

  beforeEach(async () => {
    const avatar = await Factory.build('image', {
      url: 'http://aws-endpoint.com/some/avatar.jpg',
    })
    const user = await Factory.build('user', { id: 'u1' }, { avatar })
    authenticatedUser = await user.toJson()
  })

  it('returns a url', async () => {
    await expect(query({ query: currentUserQuery })).resolves.toMatchObject({
      errors: undefined,
      data: {
        currentUser: {
          id: 'u1',
          avatar: {
            url: 'http://aws-endpoint.com/some/avatar.jpg?random=df62c7bb-3810-4216-8123-057b790afbc8',
          },
        },
      },
    })
  })
})
