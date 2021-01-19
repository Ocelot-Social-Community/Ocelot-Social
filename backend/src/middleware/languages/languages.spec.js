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
})

afterAll(async () => {
  await cleanDatabase()
})

const createPostMutation = gql`
  mutation($title: String!, $content: String!, $categoryIds: [ID]) {
    CreatePost(title: $title, content: $content, categoryIds: $categoryIds) {
      language
      languageScore
      secondaryLanguage
      secondaryLanguageScore
    }
  }
`

describe('languagesMiddleware', () => {
  variables = {
    title: 'Test post languages',
    categoryIds: ['cat9'],
  }

  beforeAll(async () => {
    await cleanDatabase()
    const user = await Factory.build('user')
    authenticatedUser = await user.toJson()
    await Factory.build('category', {
      id: 'cat9',
      name: 'Democracy & Politics',
      icon: 'university',
    })
  })

  it('detects German', async () => {
    variables = {
      ...variables,
      content: 'Jeder sollte vor seiner eigenen Tür kehren.',
    }
    const response = await mutate({
      mutation: createPostMutation,
      variables,
    })
    expect(response).toMatchObject({
      data: {
        CreatePost: {
          language: 'de',
          languageScore: 0.5134188034188034,
          secondaryLanguage: 'no',
          secondaryLanguageScore: 0.3655555555555555,
        },
      },
    })
  })

  it('detects English', async () => {
    variables = {
      ...variables,
      content: 'A journey of a thousand miles begins with a single step.',
    }
    const response = await mutate({
      mutation: createPostMutation,
      variables,
    })
    expect(response).toMatchObject({
      data: {
        CreatePost: {
          language: 'en',
          languageScore: 0.3430188679245283,
          secondaryLanguage: 'da',
          secondaryLanguageScore: 0.19968553459119498,
        },
      },
    })
  })

  it('detects Spanish', async () => {
    variables = {
      ...variables,
      content: 'A caballo regalado, no le mires el diente.',
    }
    const response = await mutate({
      mutation: createPostMutation,
      variables,
    })
    expect(response).toMatchObject({
      data: {
        CreatePost: {
          language: 'es',
          languageScore: 0.46589743589743593,
          secondaryLanguage: 'pt',
          secondaryLanguageScore: 0.3834188034188034,
        },
      },
    })
  })

  it('detects German in between lots of html tags', async () => {
    variables = {
      ...variables,
      content:
        '<strong>Jeder</strong> <strike>sollte</strike> <strong>vor</strong> <span>seiner</span> eigenen <blockquote>Tür</blockquote> kehren.',
    }
    const response = await mutate({
      mutation: createPostMutation,
      variables,
    })
    expect(response).toMatchObject({
      data: {
        CreatePost: {
          language: 'de',
          languageScore: 0.5134188034188034,
          secondaryLanguage: 'no',
          secondaryLanguageScore: 0.3655555555555555,
        },
      },
    })
  })
})
