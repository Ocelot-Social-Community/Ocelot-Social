import Factory, { cleanDatabase } from '../../db/factories'
import { gql } from '../../helpers/jest'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'
import { createTestClient } from 'apollo-server-testing'


let mutate
let authenticatedUser
let variables

const driver = getDriver()
const neode = getNeode()

beforeAll(async () => {
  const { server } = createServer({
    context: () => {
      return {
        driver,
        neode,
        user: authenticatedUser,
      }
    },
  })
  mutate = createTestClient(server).mutate
  await cleanDatabase()
  variables = {}
  const user = await Factory.build('user')
  authenticatedUser = await user.toJson()
  await Factory.build('category', {
    id: 'cat9',
    name: 'Democracy & Politics',
    icon: 'university',
  })
})


afterAll(async () => {
  //await cleanDatabase()
})


const createPostMutation = gql`
  mutation($title: String!, $content: String!, $categoryIds: [ID]) {
    CreatePost(title: $title, content: $content, categoryIds: $categoryIds) {
      language
    }
  }
`

describe('languagesMiddleware', () => {
  variables = {
    title: 'Test post languages',
    categoryIds: ['cat9'],
  }

  it('detects German', async () => {
    variables = {
      ...variables,
      content: 'Jeder sollte vor seiner eigenen Tür kehren.',
    }
    await expect(mutate({
      mutation: createPostMutation,
      variables,
    })).resolves.toMatchObject({
      data: {
        CreatePost: {
          language: 'de',
        },
      },
    })
  })
  
})
