import gql from 'graphql-tag'
import { cleanDatabase } from '../../db/factories'
import { createTestClient } from 'apollo-server-testing'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'

let server
let query
let mutate
let hashtagingUser
let authenticatedUser
const driver = getDriver()
const neode = getNeode()
const categoryIds = ['cat9']
const createPostMutation = gql`
  mutation ($id: ID, $title: String!, $postContent: String!, $categoryIds: [ID]!) {
    CreatePost(id: $id, title: $title, content: $postContent, categoryIds: $categoryIds) {
      id
      title
      content
    }
  }
`
const updatePostMutation = gql`
  mutation ($id: ID!, $title: String!, $postContent: String!, $categoryIds: [ID]!) {
    UpdatePost(id: $id, content: $postContent, title: $title, categoryIds: $categoryIds) {
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
      }
    },
  })
  server = createServerResult.server
  const createTestClientResult = createTestClient(server)
  query = createTestClientResult.query
  mutate = createTestClientResult.mutate
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

beforeEach(async () => {
  hashtagingUser = await neode.create(
    'User',
    {
      id: 'you',
      name: 'Al Capone',
      slug: 'al-capone',
    },
    {
      password: '1234',
      email: 'test@example.org',
    },
  )
  await neode.create('Category', {
    id: 'cat9',
    name: 'Democracy & Politics',
    icon: 'university',
  })
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('hashtags', () => {
  const id = 'p135'
  const title = 'Two Hashtags'
  const postContent = `
    <p>
      Hey Dude,
      <a
        class="hashtag"
        data-hashtag-id="Democracy"
        href="/?hashtag=Democracy">
          #Democracy
      </a>
      should work equal for everybody!? That seems to be the only way to have
      equal
      <a
        class="hashtag"
        data-hashtag-id="Liberty"
        href="/?hashtag=Liberty"
      >
        #Liberty
      </a>
      for everyone.
    </p>
  `
  const postWithHastagsQuery = gql`
    query ($id: ID) {
      Post(id: $id) {
        tags {
          id
        }
      }
    }
  `
  const postWithHastagsVariables = {
    id,
  }

  describe('authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = await hashtagingUser.toJson()
    })

    describe('create a Post with Hashtags', () => {
      beforeEach(async () => {
        await mutate({
          mutation: createPostMutation,
          variables: {
            id,
            title,
            postContent,
            categoryIds,
          },
        })
      })

      it('both hashtags are created with the "id" set to their "name"', async () => {
        const expected = [
          {
            id: 'Democracy',
          },
          {
            id: 'Liberty',
          },
        ]
        await expect(
          query({
            query: postWithHastagsQuery,
            variables: postWithHastagsVariables,
          }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              Post: [
                {
                  tags: expect.arrayContaining(expected),
                },
              ],
            },
          }),
        )
      })

      describe('updates the Post by removing, keeping and adding one hashtag respectively', () => {
        // The already existing hashtag has no class at this point.
        const postContent = `
          <p>
            Hey Dude,
            <a
              class="hashtag"
              data-hashtag-id="Elections"
              href="?hashtag=Elections"
            >
              #Elections
            </a>
            should work equal for everybody!? That seems to be the only way to
            have equal
            <a
              data-hashtag-id="Liberty"
              href="?hashtag=Liberty"
            >
              #Liberty
            </a>
            for everyone.
          </p>
        `

        it('only one previous Hashtag and the new Hashtag exists', async () => {
          await mutate({
            mutation: updatePostMutation,
            variables: {
              id,
              title,
              postContent,
              categoryIds,
            },
          })

          const expected = [
            {
              id: 'Elections',
            },
            {
              id: 'Liberty',
            },
          ]
          await expect(
            query({
              query: postWithHastagsQuery,
              variables: postWithHastagsVariables,
            }),
          ).resolves.toEqual(
            expect.objectContaining({
              data: {
                Post: [
                  {
                    tags: expect.arrayContaining(expected),
                  },
                ],
              },
            }),
          )
        })
      })
    })
  })
})
