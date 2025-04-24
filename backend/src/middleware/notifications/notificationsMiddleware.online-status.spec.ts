/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import CONFIG from '@src/config'
import createServer from '@src/server'

CONFIG.CATEGORIES_ACTIVE = false

const sendMailMock: (notification) => void = jest.fn()
jest.mock('@middleware/helpers/email/sendMail', () => ({
  sendMail: (notification) => sendMailMock(notification),
}))

let isUserOnlineMock = jest.fn().mockReturnValue(false)
jest.mock('../helpers/isUserOnline', () => ({
  isUserOnline: () => isUserOnlineMock(),
}))

let server, mutate, authenticatedUser

let postAuthor

const driver = getDriver()
const neode = getNeode()

const createPostMutation = gql`
  mutation ($id: ID, $title: String!, $content: String!, $groupId: ID) {
    CreatePost(id: $id, title: $title, content: $content, groupId: $groupId) {
      id
      title
      content
    }
  }
`

beforeAll(async () => {
  await cleanDatabase()

  const createServerResult = createServer({
    context: () => {
      return {
        user: authenticatedUser,
        neode,
        driver,
        cypherParams: {
          currentUserId: authenticatedUser ? authenticatedUser.id : null,
        },
      }
    },
  })
  server = createServerResult.server
  const createTestClientResult = createTestClient(server)
  mutate = createTestClientResult.mutate
})

afterAll(async () => {
  await cleanDatabase()
  await driver.close()
})

afterEach(async () => {
  await cleanDatabase()
})

describe('online status and sending emails', () => {
  beforeEach(async () => {
    postAuthor = await Factory.build(
      'user',
      {
        id: 'post-author',
        name: 'Post Author',
        slug: 'post-author',
      },
      {
        email: 'test@example.org',
        password: '1234',
      },
    )
    await Factory.build(
      'user',
      {
        id: 'other-user',
        name: 'Other User',
        slug: 'other-user',
      },
      {
        email: 'test2@example.org',
        password: '1234',
      },
    )
  })

  describe('user is online', () => {
    beforeAll(() => {
      isUserOnlineMock = jest.fn().mockReturnValue(true)
    })

    describe('mentioned in post', () => {
      beforeEach(async () => {
        jest.clearAllMocks()
        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: createPostMutation,
          variables: {
            id: 'post-online-1',
            title: 'This post mentions the other user',
            content:
              'Hello <a class="mention" data-mention-id="other-user" href="/profile/other-user/other-user">@other-user</a>, are you fine?',
          },
        })
      })

      it('sends NO email to the other user', () => {
        expect(sendMailMock).not.toBeCalled()
      })
    })
  })

  describe('user is offline', () => {
    beforeAll(() => {
      isUserOnlineMock = jest.fn().mockReturnValue(false)
    })

    describe('mentioned in post', () => {
      beforeEach(async () => {
        jest.clearAllMocks()
        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: createPostMutation,
          variables: {
            id: 'post-offline-1',
            title: 'This post mentions the other user',
            content:
              'Hello <a class="mention" data-mention-id="other-user" href="/profile/other-user/other-user">@other-user</a>, are you fine?',
          },
        })
      })

      it('sends email to the other user', () => {
        expect(sendMailMock).toBeCalledTimes(1)
      })
    })
  })
})
