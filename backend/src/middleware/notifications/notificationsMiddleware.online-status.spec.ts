/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { jest } from '@jest/globals'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context/index'

const sendNotificationMailMock: (notification) => void = jest.fn()
jest.unstable_mockModule('@src/emails/sendEmail', () => ({
  sendNotificationMail: (notification) => {
    sendNotificationMailMock(notification)
  },
  // ESM links the whole namespace: every named export ANY importer in the graph reaches
  // for must exist here, or the module fails to link (loginMiddleware pulls the
  // registration/verification mails in transitively). Under CommonJS a missing key was
  // simply undefined and only mattered if it was called. The stubs below carry no
  // behaviour — only the two above are asserted on.
  defaultParams: jest.fn(),
  sendChatMessageMail: jest.fn(),
  sendRegistrationMail: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendResetPasswordMail: jest.fn(),
  sendWrongEmail: jest.fn(),
}))

let isUserOnlineMock = jest.fn().mockReturnValue(false)
jest.unstable_mockModule('../helpers/isUserOnline', () => ({
  isUserOnline: () => isUserOnlineMock(),
}))

// Imported after the mock registrations, not above them: `unstable_mockModule`
// does not hoist, so a static import would bind the real module first.
const { default: Factory, cleanDatabase } = await import('@db/factories')
const { default: CreatePost } = await import('@graphql/queries/posts/CreatePost.gql')
const { createApolloTestSetup } = await import('@root/test/helpers')

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
const context = () => ({ authenticatedUser, policy })
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

let postAuthor

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
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
          mutation: CreatePost,
          variables: {
            id: 'post-online-1',
            title: 'This post mentions the other user',
            content:
              'Hello <a class="mention" data-mention-id="other-user" href="/profile/other-user/other-user">@other-user</a>, are you fine?',
          },
        })
      })

      it('sends NO email to the other user', () => {
        expect(sendNotificationMailMock).not.toHaveBeenCalled()
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
          mutation: CreatePost,
          variables: {
            id: 'post-offline-1',
            title: 'This post mentions the other user',
            content:
              'Hello <a class="mention" data-mention-id="other-user" href="/profile/other-user/other-user">@other-user</a>, are you fine?',
          },
        })
      })

      it('sends email to the other user', () => {
        expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
      })
    })
  })
})
