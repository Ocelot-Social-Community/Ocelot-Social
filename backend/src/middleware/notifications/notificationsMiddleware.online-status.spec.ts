/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

const sendNotificationMailMock: (notification) => void = jest.fn()
jest.mock('@src/emails/sendEmail', () => ({
  sendNotificationMail: (notification) => sendNotificationMailMock(notification),
}))

let isUserOnlineMock = jest.fn().mockReturnValue(false)
jest.mock('../helpers/isUserOnline', () => ({
  isUserOnline: () => isUserOnlineMock(),
}))

let authenticatedUser: Context['user']
const config = { CATEGORIES_ACTIVE: false }
const context = () => ({ authenticatedUser, config })
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

let postAuthor

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
  const apolloSetup = createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  await database.driver.close()
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
        expect(sendNotificationMailMock).not.toBeCalled()
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
        expect(sendNotificationMailMock).toBeCalledTimes(1)
      })
    })
  })
})
