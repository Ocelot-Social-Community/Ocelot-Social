/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { cleanDatabase } from '@db/factories'
import { CreatePost } from '@graphql/queries/CreatePost'
import { Post } from '@graphql/queries/Post'
import { UpdatePost } from '@graphql/queries/UpdatePost'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let hashtagingUser
let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
let mutate: ApolloTestSetup['mutate']
let query: any // eslint-disable-line @typescript-eslint/no-explicit-any
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
const categoryIds = ['cat9']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

beforeEach(async () => {
  hashtagingUser = await database.neode.create('User', {
    id: 'you',
    name: 'Al Capone',
    slug: 'al-capone',
  })
  await database.neode.create('Category', {
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
          mutation: CreatePost,
          variables: {
            id,
            title,
            content: postContent,
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
            query: Post,
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
            mutation: UpdatePost,
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
              query: Post,
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
