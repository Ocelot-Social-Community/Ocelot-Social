/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

jest.mock('uuid', () => ({
  v4: () => 'df62c7bb-3810-4216-8123-057b790afbc8',
}))

const graphqlQuery = gql`
  {
    currentUser {
      id
      avatar {
        url
      }
    }
  }
`

let authenticatedUser: Context['user']
let S3_PUBLIC_URL: string | undefined
const context = () => ({ authenticatedUser, config: { S3_PUBLIC_URL } })
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(() => {
  const apolloSetup = createApolloTestSetup({ context })
  query = apolloSetup.query
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

describe('publicS3Middleware', () => {
  beforeEach(async () => {
    const avatar = await Factory.build('image', {
      url: 'http://aws-endpoint.com/some/avatar.jpg',
    })
    const user = await Factory.build('user', { id: 'u1' }, { avatar })
    authenticatedUser = await user.toJson()
  })

  describe('if no `S3_PUBLIC_URL` is set', () => {
    beforeEach(() => {
      S3_PUBLIC_URL = undefined
    })

    it('does absolutely nothing', async () => {
      await expect(query({ query: graphqlQuery })).resolves.toMatchObject({
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

  describe('but if a `S3_PUBLIC_URL` is set', () => {
    beforeEach(() => {
      S3_PUBLIC_URL = 'http://public-s3-url.com'
    })

    it('replaces the host - this is necessary in a docker environment as the backend sees a different endpoint than the web frontend', async () => {
      await expect(query({ query: graphqlQuery })).resolves.toMatchObject({
        errors: undefined,
        data: {
          currentUser: {
            id: 'u1',
            avatar: {
              url: 'http://public-s3-url.com/some/avatar.jpg?random=df62c7bb-3810-4216-8123-057b790afbc8',
            },
          },
        },
      })
    })
  })
})
