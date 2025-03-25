import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'

import { createPostMutation } from '../../graphql/posts'
import CONFIG from '../../config'

CONFIG.CATEGORIES_ACTIVE = false

const driver = getDriver()
const neode = getNeode()

// let query
let mutate
let authenticatedUser
let user

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        driver,
        neode,
        user: authenticatedUser,
        cypherParams: {
          currentUserId: authenticatedUser ? authenticatedUser.id : null,
        },
      }
    },
  })
  // query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

describe('observing posts', () => {
  beforeAll(async () => {
    user = await Factory.build('user', {
      id: 'user',
      name: 'User',
      about: 'I am a user',
    })
    authenticatedUser = await user.toJson()
  })

  describe('after creating the post', () => {
    it('has the author of the post observing the post', async () => {
      await expect(
        mutate({
          mutation: createPostMutation(),
          variables: {
            id: 'p2',
            title: 'A post the author should observe',
            content: 'The author of this post is expected to observe the post',
          },
        }),
      ).resolves.toMatchObject({
        data: {
          CreatePost: {
            observedByMe: true,
          },
        },
        errors: undefined,
      })
    })
  })
})
