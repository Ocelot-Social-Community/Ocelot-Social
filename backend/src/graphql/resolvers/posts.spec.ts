/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import Image from '@db/models/Image'
import { createGroupMutation } from '@graphql/queries/createGroupMutation'
import { createPostMutation } from '@graphql/queries/createPostMutation'
import { Post } from '@graphql/queries/Post'
import { pushPost } from '@graphql/queries/pushPost'
import { unpushPost } from '@graphql/queries/unpushPost'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let user

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser, config })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const defaultConfig = {
  CATEGORIES_ACTIVE: true,
  // MAPBOX_TOKEN: CONFIG.MAPBOX_TOKEN,
}
let config: Partial<Context['config']>

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(() => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

const categoryIds = ['cat9', 'cat4', 'cat15']
let variables

beforeEach(async () => {
  config = { ...defaultConfig }
  variables = {}
  user = await Factory.build(
    'user',
    {
      id: 'current-user',
      name: 'TestUser',
    },
    {
      email: 'test@example.org',
      password: '1234',
    },
  )
  await Promise.all([
    database.neode.create('Category', {
      id: 'cat9',
      name: 'Democracy & Politics',
      icon: 'university',
    }),
    database.neode.create('Category', {
      id: 'cat4',
      name: 'Environment & Nature',
      icon: 'tree',
    }),
    database.neode.create('Category', {
      id: 'cat15',
      name: 'Consumption & Sustainability',
      icon: 'shopping-cart',
    }),
    database.neode.create('Category', {
      id: 'cat27',
      name: 'Animal Protection',
      icon: 'paw',
    }),
  ])
  authenticatedUser = null
})

afterEach(async () => {
  await cleanDatabase()
})

describe('Post', () => {
  describe('can be filtered', () => {
    let followedUser, happyPost, cryPost
    beforeEach(async () => {
      ;[followedUser] = await Promise.all([
        Factory.build(
          'user',
          {
            id: 'followed-by-me',
            name: 'Followed User',
          },
          {
            email: 'followed@example.org',
            password: '1234',
          },
        ),
      ])
      ;[happyPost, cryPost] = await Promise.all([
        Factory.build('post', { id: 'happy-post' }, { categoryIds: ['cat4'] }),
        Factory.build('post', { id: 'cry-post' }, { categoryIds: ['cat15'] }),
        Factory.build(
          'post',
          {
            id: 'post-by-followed-user',
          },
          {
            categoryIds: ['cat9'],
            author: followedUser,
          },
        ),
      ])
    })

    describe('no filter', () => {
      it('returns all posts', async () => {
        const postQueryNoFilters = gql`
          query Post($filter: _PostFilter) {
            Post(filter: $filter) {
              id
            }
          }
        `
        const expected = [{ id: 'happy-post' }, { id: 'cry-post' }, { id: 'post-by-followed-user' }]
        variables = { filter: {} }
        await expect(query({ query: postQueryNoFilters, variables })).resolves.toMatchObject({
          data: {
            Post: expect.arrayContaining(expected),
          },
        })
      })
    })

    /* it('by categories', async () => {
      const postQueryFilteredByCategories = gql`
        query Post($filter: _PostFilter) {
          Post(filter: $filter) {
            id
            categories {
              id
            }
          }
        }
      `
      const expected = {
        data: {
          Post: [
            {
              id: 'post-by-followed-user',
              categories: [{ id: 'cat9' }],
            },
          ],
        },
      }
      variables = { ...variables, filter: { categories_some: { id_in: ['cat9'] } } }
      await expect(
        query({ query: postQueryFilteredByCategories, variables }),
      ).resolves.toMatchObject(expected)
    }) */

    describe('by emotions', () => {
      const postQueryFilteredByEmotions = gql`
        query Post($filter: _PostFilter) {
          Post(filter: $filter) {
            id
            emotions {
              emotion
            }
          }
        }
      `

      it('filters by single emotion', async () => {
        const expected = {
          data: {
            Post: [
              {
                id: 'happy-post',
                emotions: [{ emotion: 'happy' }],
              },
            ],
          },
        }
        await user.relateTo(happyPost, 'emoted', { emotion: 'happy' })
        variables = { ...variables, filter: { emotions_some: { emotion_in: ['happy'] } } }
        await expect(
          query({ query: postQueryFilteredByEmotions, variables }),
        ).resolves.toMatchObject(expected)
      })

      it('filters by multiple emotions', async () => {
        const expected = [
          {
            id: 'happy-post',
            emotions: [{ emotion: 'happy' }],
          },
          {
            id: 'cry-post',
            emotions: [{ emotion: 'cry' }],
          },
        ]
        await user.relateTo(happyPost, 'emoted', { emotion: 'happy' })
        await user.relateTo(cryPost, 'emoted', { emotion: 'cry' })
        variables = { ...variables, filter: { emotions_some: { emotion_in: ['happy', 'cry'] } } }
        await expect(
          query({ query: postQueryFilteredByEmotions, variables }),
        ).resolves.toMatchObject({
          data: {
            Post: expect.arrayContaining(expected),
          },
          errors: undefined,
        })
      })
    })

    it('by followed-by', async () => {
      const postQueryFilteredByUsersFollowed = gql`
        query Post($filter: _PostFilter) {
          Post(filter: $filter) {
            id
            author {
              name
            }
          }
        }
      `

      await user.relateTo(followedUser, 'following')
      variables = { filter: { author: { followedBy_some: { id: 'current-user' } } } }
      await expect(
        query({ query: postQueryFilteredByUsersFollowed, variables }),
      ).resolves.toMatchObject({
        data: {
          Post: [
            {
              id: 'post-by-followed-user',
              author: { name: 'Followed User' },
            },
          ],
        },
        errors: undefined,
      })
    })
  })
})

describe('CreatePost', () => {
  beforeEach(() => {
    variables = {
      ...variables,
      id: 'p3589',
      title: 'I am a title',
      content: 'Some content',
      categoryIds,
    }
  })

  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      const { errors } = await mutate({ mutation: createPostMutation(), variables })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    it('creates a post', async () => {
      const expected = {
        data: { CreatePost: { title: 'I am a title', content: 'Some content' } },
        errors: undefined,
      }
      await expect(mutate({ mutation: createPostMutation(), variables })).resolves.toMatchObject(
        expected,
      )
    })

    it('assigns the authenticated user as author', async () => {
      const expected = {
        data: {
          CreatePost: {
            title: 'I am a title',
            author: {
              name: 'TestUser',
            },
          },
        },
        errors: undefined,
      }
      await expect(mutate({ mutation: createPostMutation(), variables })).resolves.toMatchObject(
        expected,
      )
    })

    it('`disabled` and `deleted` default to `false`', async () => {
      const expected = { data: { CreatePost: { disabled: false, deleted: false } } }
      await expect(mutate({ mutation: createPostMutation(), variables })).resolves.toMatchObject(
        expected,
      )
    })

    it('has label "Article" as default', async () => {
      await expect(mutate({ mutation: createPostMutation(), variables })).resolves.toMatchObject({
        data: { CreatePost: { postType: ['Article'] } },
      })
    })

    describe('with invalid post type', () => {
      it('throws an error', async () => {
        await expect(
          mutate({
            mutation: createPostMutation(),
            variables: { ...variables, postType: 'not-valid' },
          }),
        ).resolves.toMatchObject({
          errors: [
            {
              message:
                'Variable "$postType" got invalid value "not-valid"; Expected type PostType.',
            },
          ],
        })
      })
    })

    describe('with post type "Event"', () => {
      describe('without event start date', () => {
        it('throws an error', async () => {
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
              },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: "Cannot read properties of undefined (reading 'eventStart')",
              },
            ],
          })
        })
      })

      describe('with invalid event start date', () => {
        it('throws an error', async () => {
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: 'no date',
                },
              },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: 'Event start date must be a valid date!',
              },
            ],
          })
        })
      })

      describe('with event start in no ISO format', () => {
        it('throws an error', async () => {
          const now = new Date()
          const eventStart = new Date(now.getFullYear(), now.getMonth() - 1).toISOString()
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: eventStart.split('T')[0],
                },
              },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: 'Event start date must be in ISO format!',
              },
            ],
          })
        })
      })

      describe('with event start date in the past', () => {
        it('throws an error', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() - 1).toISOString(),
                },
              },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: 'Event start date must be in the future!',
              },
            ],
          })
        })
      })

      describe('with valid start date and invalid end date', () => {
        it('throws an error', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                  eventEnd: 'not-valid',
                },
              },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: 'Event end date must be a valid date!',
              },
            ],
          })
        })
      })

      describe('with valid start date and not ISO formated end date', () => {
        it('throws an error', async () => {
          const now = new Date()
          const eventEnd = new Date(now.getFullYear(), now.getMonth() + 2).toISOString()
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                  eventEnd: eventEnd.split('T')[0],
                },
              },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: 'Event end date must be in ISO format!',
              },
            ],
          })
        })
      })

      describe('with valid start date and end date before start date', () => {
        it('throws an error', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() + 2).toISOString(),
                  eventEnd: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                },
              },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: 'Event end date must be a after event start date!',
              },
            ],
          })
        })
      })

      describe('with valid start date and valid end date', () => {
        it('creates the event', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                  eventEnd: new Date(now.getFullYear(), now.getMonth() + 2).toISOString(),
                },
              },
            }),
          ).resolves.toMatchObject({
            data: {
              CreatePost: {
                postType: ['Event'],
                eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                eventEnd: new Date(now.getFullYear(), now.getMonth() + 2).toISOString(),
                eventIsOnline: false,
              },
            },
            errors: undefined,
          })
        })
      })

      describe('with valid start date and event is online', () => {
        it('creates the event', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                  eventIsOnline: true,
                },
              },
            }),
          ).resolves.toMatchObject({
            data: {
              CreatePost: {
                postType: ['Event'],
                eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                eventIsOnline: true,
              },
            },
            errors: undefined,
          })
        })
      })

      describe('event location name is given but event venue is missing', () => {
        it('throws an error', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                  eventLocationName: 'Berlin',
                },
              },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: 'Event venue must be present if event location is given!',
              },
            ],
          })
        })
      })

      describe('valid event input without location', () => {
        it('has label "Event" set', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                },
              },
            }),
          ).resolves.toMatchObject({
            data: {
              CreatePost: {
                postType: ['Event'],
                eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                eventIsOnline: false,
              },
            },
            errors: undefined,
          })
        })
      })

      describe('valid event input with location name', () => {
        it('has label "Event" set', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: createPostMutation(),
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                  eventLocationName: 'Leipzig',
                  eventVenue: 'Connewitzer Kreuz',
                },
              },
            }),
          ).resolves.toMatchObject({
            data: {
              CreatePost: {
                postType: ['Event'],
                eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                eventLocationName: 'Leipzig',
                eventVenue: 'Connewitzer Kreuz',
                eventLocation: {
                  lng: 12.375101,
                  lat: 51.34083,
                },
              },
            },
            errors: undefined,
          })
        })
      })
    })
  })
})

describe('UpdatePost', () => {
  let author, newlyCreatedPost
  const updatePostMutation = gql`
    mutation (
      $id: ID!
      $title: String!
      $content: String!
      $image: ImageInput
      $categoryIds: [ID]
      $postType: PostType
      $eventInput: _EventInput
    ) {
      UpdatePost(
        id: $id
        title: $title
        content: $content
        image: $image
        categoryIds: $categoryIds
        postType: $postType
        eventInput: $eventInput
      ) {
        id
        title
        content
        author {
          name
          slug
        }
        createdAt
        updatedAt
        categories {
          id
        }
        postType
        eventStart
        eventLocationName
        eventVenue
        eventLocation {
          lng
          lat
        }
      }
    }
  `
  beforeEach(async () => {
    author = await Factory.build('user', { slug: 'the-author' })
    authenticatedUser = await author.toJson()
    const { data } = await mutate({
      mutation: createPostMutation(),
      variables: {
        title: 'Old title',
        content: 'Old content',
        categoryIds,
      },
    })
    newlyCreatedPost = (data as any).CreatePost // eslint-disable-line @typescript-eslint/no-explicit-any
    variables = {
      id: newlyCreatedPost.id,
      title: 'New title',
      content: 'New content',
    }
  })

  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      authenticatedUser = null
      await expect(mutate({ mutation: updatePostMutation, variables })).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { UpdatePost: null },
      })
    })
  })

  describe('authenticated but not the author', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    it('throws authorization error', async () => {
      const { errors } = await mutate({ mutation: updatePostMutation, variables })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })
  })

  describe('authenticated as author', () => {
    beforeEach(async () => {
      authenticatedUser = await author.toJson()
    })

    it('updates a post', async () => {
      const expected = {
        data: { UpdatePost: { id: newlyCreatedPost.id, content: 'New content' } },
        errors: undefined,
      }
      await expect(mutate({ mutation: updatePostMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })

    it('updates a post, but maintains non-updated attributes', async () => {
      const expected = {
        data: {
          UpdatePost: {
            id: newlyCreatedPost.id,
            content: 'New content',
            createdAt: expect.any(String),
          },
        },
        errors: undefined,
      }
      await expect(mutate({ mutation: updatePostMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })

    it('updates the updatedAt attribute', async () => {
      const {
        data: { UpdatePost },
      } = (await mutate({ mutation: updatePostMutation, variables })) as any // eslint-disable-line @typescript-eslint/no-explicit-any
      expect(UpdatePost.updatedAt).toBeTruthy()
      expect(Date.parse(UpdatePost.updatedAt)).toEqual(expect.any(Number))
      expect(newlyCreatedPost.updatedAt).not.toEqual(UpdatePost.updatedAt)
    })

    describe('no new category ids provided for update', () => {
      it('resolves and keeps current categories', async () => {
        const expected = {
          data: {
            UpdatePost: {
              id: newlyCreatedPost.id,
              categories: expect.arrayContaining([{ id: 'cat9' }, { id: 'cat4' }, { id: 'cat15' }]),
            },
          },
          errors: undefined,
        }
        await expect(mutate({ mutation: updatePostMutation, variables })).resolves.toMatchObject(
          expected,
        )
      })
    })

    describe('given category ids', () => {
      beforeEach(() => {
        variables = { ...variables, categoryIds: ['cat27'] }
      })

      it('updates categories of a post', async () => {
        const expected = {
          data: {
            UpdatePost: {
              id: newlyCreatedPost.id,
              categories: expect.arrayContaining([{ id: 'cat27' }]),
            },
          },
          errors: undefined,
        }
        await expect(mutate({ mutation: updatePostMutation, variables })).resolves.toMatchObject(
          expected,
        )
      })
    })

    describe('change post type to event', () => {
      describe('with missing event start date', () => {
        it('throws an error', async () => {
          await expect(
            mutate({
              mutation: updatePostMutation,
              variables: { ...variables, postType: 'Event' },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: "Cannot read properties of undefined (reading 'eventStart')",
              },
            ],
          })
        })
      })

      describe('with invalid event start date', () => {
        it('throws an error', async () => {
          await expect(
            mutate({
              mutation: updatePostMutation,
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: 'no-date',
                },
              },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: 'Event start date must be a valid date!',
              },
            ],
          })
        })
      })

      describe('with event start date in the past', () => {
        it('throws an error', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: updatePostMutation,
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() - 1).toISOString(),
                },
              },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: 'Event start date must be in the future!',
              },
            ],
          })
        })
      })

      describe('event location name is given but event venue is missing', () => {
        it('throws an error', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: updatePostMutation,
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                  eventLocationName: 'Berlin',
                },
              },
            }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: 'Event venue must be present if event location is given!',
              },
            ],
          })
        })
      })

      describe('valid event input without location name', () => {
        it('has label "Event" set', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: updatePostMutation,
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                },
              },
            }),
          ).resolves.toMatchObject({
            data: {
              UpdatePost: {
                postType: ['Event'],
                eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
              },
            },
            errors: undefined,
          })
        })
      })

      describe('valid event input with location name', () => {
        it('has label "Event" set', async () => {
          const now = new Date()
          await expect(
            mutate({
              mutation: updatePostMutation,
              variables: {
                ...variables,
                postType: 'Event',
                eventInput: {
                  eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                  eventLocationName: 'Leipzig',
                  eventVenue: 'Connewitzer Kreuz',
                },
              },
            }),
          ).resolves.toMatchObject({
            data: {
              UpdatePost: {
                postType: ['Event'],
                eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                eventLocationName: 'Leipzig',
                eventVenue: 'Connewitzer Kreuz',
                eventLocation: {
                  lng: 12.375101,
                  lat: 51.34083,
                },
              },
            },
            errors: undefined,
          })
        })
      })
    })

    // eslint-disable-next-line jest/no-disabled-tests
    describe.skip('params.image', () => {
      describe('is object', () => {
        beforeEach(() => {
          variables = { ...variables, image: { sensitive: true } }
        })
        it('updates the image', async () => {
          await expect(
            database.neode.first<typeof Image>('Image', { sensitive: true }, undefined),
          ).resolves.toBeFalsy()
          await mutate({ mutation: updatePostMutation, variables })
          await expect(
            database.neode.first<typeof Image>('Image', { sensitive: true }, undefined),
          ).resolves.toBeTruthy()
        })
      })

      describe('is null', () => {
        beforeEach(() => {
          variables = { ...variables, image: null }
        })
        it('deletes the image', async () => {
          await expect(database.neode.all('Image')).resolves.toHaveLength(6)
          await mutate({ mutation: updatePostMutation, variables })
          await expect(database.neode.all('Image')).resolves.toHaveLength(5)
        })
      })

      describe('is undefined', () => {
        beforeEach(() => {
          delete variables.image
        })
        it('keeps the image unchanged', async () => {
          await expect(
            database.neode.first<typeof Image>('Image', { sensitive: true }, undefined),
          ).resolves.toBeFalsy()
          await mutate({ mutation: updatePostMutation, variables })
          await expect(
            database.neode.first<typeof Image>('Image', { sensitive: true }, undefined),
          ).resolves.toBeFalsy()
        })
      })
    })
  })
})

describe('push posts', () => {
  let author
  beforeEach(async () => {
    author = await Factory.build('user', { slug: 'the-author' })
    await Factory.build(
      'post',
      {
        id: 'pFirst',
      },
      {
        author,
        categoryIds,
      },
    )
    await Factory.build(
      'post',
      {
        id: 'pSecond',
      },
      {
        author,
        categoryIds,
      },
    )
    await Factory.build(
      'post',
      {
        id: 'pThird',
      },
      {
        author,
        categoryIds,
      },
    )
  })

  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      authenticatedUser = null
      await expect(
        mutate({ mutation: pushPost, variables: { id: 'pSecond' } }),
      ).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: null,
      })
    })
  })

  describe('ordinary users', () => {
    it('throws authorization error', async () => {
      await expect(
        mutate({ mutation: pushPost, variables: { id: 'pSecond' } }),
      ).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: null,
      })
    })
  })

  describe('moderators', () => {
    let moderator
    beforeEach(async () => {
      moderator = await user.update({ role: 'moderator', updatedAt: new Date().toISOString() })
      authenticatedUser = await moderator.toJson()
    })

    it('throws authorization error', async () => {
      await expect(
        mutate({ mutation: pushPost, variables: { id: 'pSecond' } }),
      ).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: null,
      })
    })
  })

  describe('admins', () => {
    let admin
    beforeEach(async () => {
      admin = await Factory.build('user', {
        id: 'admin',
        role: 'admin',
      })
      authenticatedUser = await admin.toJson()
    })

    it('pushes the post to the front of the feed', async () => {
      await expect(
        query({ query: Post, variables: { orderBy: ['sortDate_desc'] } }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          Post: [
            {
              id: 'pThird',
            },
            {
              id: 'pSecond',
            },
            {
              id: 'pFirst',
            },
          ],
        },
      })
      await expect(
        mutate({ mutation: pushPost, variables: { id: 'pSecond' } }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          pushPost: {
            id: 'pSecond',
          },
        },
      })
      await expect(
        query({ query: Post, variables: { orderBy: ['sortDate_desc'] } }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          Post: [
            {
              id: 'pSecond',
            },
            {
              id: 'pThird',
            },
            {
              id: 'pFirst',
            },
          ],
        },
      })
    })
  })
})

describe('unpush posts', () => {
  let author
  let admin
  beforeEach(async () => {
    author = await Factory.build('user', { slug: 'the-author' })
    await Factory.build(
      'post',
      {
        id: 'pFirst',
      },
      {
        author,
        categoryIds,
      },
    )
    await Factory.build(
      'post',
      {
        id: 'pSecond',
      },
      {
        author,
        categoryIds,
      },
    )
    await Factory.build(
      'post',
      {
        id: 'pThird',
      },
      {
        author,
        categoryIds,
      },
    )
    admin = await Factory.build('user', {
      id: 'admin',
      role: 'admin',
    })
    authenticatedUser = await admin.toJson()
    await mutate({ mutation: pushPost, variables: { id: 'pSecond' } })
    authenticatedUser = null
  })

  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      authenticatedUser = null
      await expect(
        mutate({ mutation: unpushPost, variables: { id: 'pSecond' } }),
      ).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: null,
      })
    })
  })

  describe('ordinary users', () => {
    it('throws authorization error', async () => {
      authenticatedUser = await user.toJson()
      await expect(
        mutate({ mutation: unpushPost, variables: { id: 'pSecond' } }),
      ).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: null,
      })
    })
  })

  describe('moderators', () => {
    let moderator
    beforeEach(async () => {
      moderator = await user.update({ role: 'moderator', updatedAt: new Date().toISOString() })
      authenticatedUser = await moderator.toJson()
    })

    it('throws authorization error', async () => {
      await expect(
        mutate({ mutation: unpushPost, variables: { id: 'pSecond' } }),
      ).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: null,
      })
    })
  })

  describe('admins', () => {
    it('cancels the push of the post and puts it in the original order', async () => {
      authenticatedUser = await admin.toJson()
      await expect(
        query({ query: Post, variables: { orderBy: ['sortDate_desc'] } }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          Post: [
            {
              id: 'pSecond',
            },
            {
              id: 'pThird',
            },
            {
              id: 'pFirst',
            },
          ],
        },
      })
      await expect(
        mutate({ mutation: unpushPost, variables: { id: 'pSecond' } }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          unpushPost: {
            id: 'pSecond',
          },
        },
      })
      await expect(
        query({ query: Post, variables: { orderBy: ['sortDate_desc'] } }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          Post: [
            {
              id: 'pThird',
            },
            {
              id: 'pSecond',
            },
            {
              id: 'pFirst',
            },
          ],
        },
      })
    })
  })
})

describe('pin posts', () => {
  let author
  const pinPostMutation = gql`
    mutation ($id: ID!) {
      pinPost(id: $id) {
        id
        title
        content
        author {
          name
          slug
        }
        pinnedBy {
          id
          name
          role
        }
        createdAt
        updatedAt
        pinnedAt
        pinned
      }
    }
  `
  beforeEach(async () => {
    author = await Factory.build('user', { slug: 'the-author' })
    await Factory.build(
      'post',
      {
        id: 'p9876',
        title: 'Old title',
        content: 'Old content',
      },
      {
        author,
        categoryIds,
      },
    )
    variables = {
      id: 'p9876',
    }
  })

  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      authenticatedUser = null
      await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { pinPost: null },
      })
    })
  })

  describe('ordinary users', () => {
    it('throws authorization error', async () => {
      await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { pinPost: null },
      })
    })
  })

  describe('moderators', () => {
    let moderator
    beforeEach(async () => {
      moderator = await user.update({ role: 'moderator', updatedAt: new Date().toISOString() })
      authenticatedUser = await moderator.toJson()
    })

    it('throws authorization error', async () => {
      await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { pinPost: null },
      })
    })
  })

  describe('admins', () => {
    let admin
    beforeEach(async () => {
      admin = await user.update({
        role: 'admin',
        name: 'Admin',
        updatedAt: new Date().toISOString(),
      })
      authenticatedUser = await admin.toJson()
    })

    describe('MAX_PINNED_POSTS is 0', () => {
      beforeEach(async () => {
        config = { ...defaultConfig, MAX_PINNED_POSTS: 0 }

        await Factory.build(
          'post',
          {
            id: 'created-and-pinned-by-same-admin',
          },
          {
            author: admin,
          },
        )
        variables = { ...variables, id: 'created-and-pinned-by-same-admin' }
      })

      it('throws with error that pinning posts is not allowed', async () => {
        await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject({
          data: { pinPost: null },
          errors: [{ message: 'Pinned posts are not allowed!' }],
        })
      })
    })

    describe('MAX_PINNED_POSTS is 1', () => {
      beforeEach(() => {
        config = { ...defaultConfig, MAX_PINNED_POSTS: 1 }
      })

      describe('are allowed to pin posts', () => {
        beforeEach(async () => {
          await Factory.build(
            'post',
            {
              id: 'created-and-pinned-by-same-admin',
            },
            {
              author: admin,
            },
          )
          variables = { ...variables, id: 'created-and-pinned-by-same-admin' }
        })

        it('responds with the updated Post', async () => {
          const expected = {
            data: {
              pinPost: {
                id: 'created-and-pinned-by-same-admin',
                author: {
                  name: 'Admin',
                },
                pinnedBy: {
                  id: 'current-user',
                  name: 'Admin',
                  role: 'admin',
                },
              },
            },
            errors: undefined,
          }

          await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject(
            expected,
          )
        })

        it('sets createdAt date for PINNED', async () => {
          const expected = {
            data: {
              pinPost: {
                id: 'created-and-pinned-by-same-admin',
                pinnedAt: expect.any(String),
              },
            },
            errors: undefined,
          }
          await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject(
            expected,
          )
        })

        it('sets redundant `pinned` property for performant ordering', async () => {
          variables = { ...variables, id: 'created-and-pinned-by-same-admin' }
          const expected = {
            data: { pinPost: { pinned: true } },
            errors: undefined,
          }
          await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject(
            expected,
          )
        })
      })

      describe('post created by another admin', () => {
        let otherAdmin
        beforeEach(async () => {
          otherAdmin = await Factory.build('user', {
            role: 'admin',
            name: 'otherAdmin',
          })
          authenticatedUser = await otherAdmin.toJson()
          await Factory.build(
            'post',
            {
              id: 'created-by-one-admin-pinned-by-different-one',
            },
            {
              author: otherAdmin,
            },
          )
        })

        it('responds with the updated Post', async () => {
          authenticatedUser = await admin.toJson()
          variables = { ...variables, id: 'created-by-one-admin-pinned-by-different-one' }
          const expected = {
            data: {
              pinPost: {
                id: 'created-by-one-admin-pinned-by-different-one',
                author: {
                  name: 'otherAdmin',
                },
                pinnedBy: {
                  id: 'current-user',
                  name: 'Admin',
                  role: 'admin',
                },
              },
            },
            errors: undefined,
          }

          await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject(
            expected,
          )
        })
      })

      describe('post created by another user', () => {
        it('responds with the updated Post', async () => {
          const expected = {
            data: {
              pinPost: {
                id: 'p9876',
                author: {
                  slug: 'the-author',
                },
                pinnedBy: {
                  id: 'current-user',
                  name: 'Admin',
                  role: 'admin',
                },
              },
            },
            errors: undefined,
          }

          await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject(
            expected,
          )
        })
      })

      describe('pinned post already exists', () => {
        let pinnedPost
        beforeEach(async () => {
          await Factory.build(
            'post',
            {
              id: 'only-pinned-post',
            },
            {
              author: admin,
            },
          )
          await mutate({ mutation: pinPostMutation, variables })
        })

        it('removes previous `pinned` attribute', async () => {
          const cypher = 'MATCH (post:Post) WHERE post.pinned IS NOT NULL RETURN post'
          pinnedPost = await database.neode.cypher(cypher, {})
          expect(pinnedPost.records).toHaveLength(1)
          variables = { ...variables, id: 'only-pinned-post' }
          await mutate({ mutation: pinPostMutation, variables })
          pinnedPost = await database.neode.cypher(cypher, {})
          expect(pinnedPost.records).toHaveLength(1)
        })

        it('removes previous PINNED relationship', async () => {
          variables = { ...variables, id: 'only-pinned-post' }
          await mutate({ mutation: pinPostMutation, variables })
          pinnedPost = await database.neode.cypher(
            `MATCH (:User)-[pinned:PINNED]->(post:Post) RETURN post, pinned`,
            {},
          )
          expect(pinnedPost.records).toHaveLength(1)
        })
      })

      describe('post in public group', () => {
        beforeEach(async () => {
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              name: 'Public Group',
              id: 'public-group',
              about: 'This is a public group',
              groupType: 'public',
              actionRadius: 'regional',
              description:
                'This is a public group to test if the posts of this group can be pinned.',
              categoryIds,
            },
          })
          await mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'public-group-post',
              title: 'Public group post',
              content: 'This is a post in a public group',
              groupId: 'public-group',
              categoryIds,
            },
          })
          variables = { ...variables, id: 'public-group-post' }
        })

        it('can be pinned', async () => {
          await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject({
            data: {
              pinPost: {
                id: 'public-group-post',
                author: {
                  slug: 'testuser',
                },
                pinnedBy: {
                  id: 'current-user',
                  name: 'Admin',
                  role: 'admin',
                },
              },
            },
            errors: undefined,
          })
        })
      })

      describe('post in closed group', () => {
        beforeEach(async () => {
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              name: 'Closed Group',
              id: 'closed-group',
              about: 'This is a closed group',
              groupType: 'closed',
              actionRadius: 'regional',
              description:
                'This is a closed group to test if the posts of this group can be pinned.',
              categoryIds,
            },
          })
          await mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'closed-group-post',
              title: 'Closed group post',
              content: 'This is a post in a closed group',
              groupId: 'closed-group',
              categoryIds,
            },
          })
          variables = { ...variables, id: 'closed-group-post' }
        })

        it('can not be pinned', async () => {
          await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject({
            data: {
              pinPost: null,
            },
            errors: undefined,
          })
        })
      })

      describe('post in hidden group', () => {
        beforeEach(async () => {
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              name: 'Hidden Group',
              id: 'hidden-group',
              about: 'This is a hidden group',
              groupType: 'hidden',
              actionRadius: 'regional',
              description:
                'This is a hidden group to test if the posts of this group can be pinned.',
              categoryIds,
            },
          })
          await mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'hidden-group-post',
              title: 'Hidden group post',
              content: 'This is a post in a hidden group',
              groupId: 'hidden-group',
              categoryIds,
            },
          })
          variables = { ...variables, id: 'hidden-group-post' }
        })

        it('can not be pinned', async () => {
          await expect(mutate({ mutation: pinPostMutation, variables })).resolves.toMatchObject({
            data: {
              pinPost: null,
            },
            errors: undefined,
          })
        })
      })

      describe('PostOrdering', () => {
        beforeEach(async () => {
          await Factory.build('post', {
            id: 'im-a-pinned-post',
            createdAt: '2019-11-22T17:26:29.070Z',
            pinned: true,
          })
          await Factory.build('post', {
            id: 'i-was-created-before-pinned-post',
            // fairly old, so this should be 3rd
            createdAt: '2019-10-22T17:26:29.070Z',
          })
        })

        describe('order by `pinned_asc` and `createdAt_desc`', () => {
          beforeEach(() => {
            // this is the ordering in the frontend
            variables = { orderBy: ['pinned_asc', 'createdAt_desc'] }
          })

          it('pinned post appear first even when created before other posts', async () => {
            await expect(query({ query: Post, variables })).resolves.toMatchObject({
              data: {
                Post: [
                  {
                    id: 'im-a-pinned-post',
                    pinned: true,
                    createdAt: '2019-11-22T17:26:29.070Z',
                    pinnedAt: expect.any(String),
                  },
                  {
                    id: 'p9876',
                    pinned: null,
                    createdAt: expect.any(String),
                    pinnedAt: null,
                  },
                  {
                    id: 'i-was-created-before-pinned-post',
                    pinned: null,
                    createdAt: '2019-10-22T17:26:29.070Z',
                    pinnedAt: null,
                  },
                ],
              },
              errors: undefined,
            })
          })
        })
      })
    })

    describe('MAX_PINNED_POSTS = 3', () => {
      const postsPinnedCountsQuery = `query { PostsPinnedCounts { maxPinnedPosts, currentlyPinnedPosts } }`

      beforeEach(async () => {
        config = { ...defaultConfig, MAX_PINNED_POSTS: 3 }

        await Factory.build(
          'post',
          {
            id: 'first-post',
            createdAt: '2019-10-22T17:26:29.070Z',
          },
          {
            author: admin,
          },
        )
        await Factory.build(
          'post',
          {
            id: 'second-post',
            createdAt: '2018-10-22T17:26:29.070Z',
          },
          {
            author: admin,
          },
        )
        await Factory.build(
          'post',
          {
            id: 'third-post',
            createdAt: '2017-10-22T17:26:29.070Z',
          },
          {
            author: admin,
          },
        )
        await Factory.build(
          'post',
          {
            id: 'another-post',
          },
          {
            author: admin,
          },
        )
      })

      describe('first post', () => {
        let result

        beforeEach(async () => {
          variables = { ...variables, id: 'first-post' }
          result = await mutate({ mutation: pinPostMutation, variables })
        })

        it('pins the first post', () => {
          expect(result).toMatchObject({
            data: {
              pinPost: {
                id: 'first-post',
                pinned: true,
                pinnedAt: expect.any(String),
                pinnedBy: {
                  id: 'current-user',
                },
              },
            },
          })
        })

        it('returns the correct counts', async () => {
          await expect(
            query({
              query: postsPinnedCountsQuery,
            }),
          ).resolves.toMatchObject({
            data: {
              PostsPinnedCounts: {
                maxPinnedPosts: 3,
                currentlyPinnedPosts: 1,
              },
            },
          })
        })

        describe('second post', () => {
          beforeEach(async () => {
            variables = { ...variables, id: 'second-post' }
            result = await mutate({ mutation: pinPostMutation, variables })
          })

          it('pins the second post', () => {
            expect(result).toMatchObject({
              data: {
                pinPost: {
                  id: 'second-post',
                  pinned: true,
                  pinnedAt: expect.any(String),
                  pinnedBy: {
                    id: 'current-user',
                  },
                },
              },
            })
          })

          it('returns the correct counts', async () => {
            await expect(
              query({
                query: postsPinnedCountsQuery,
              }),
            ).resolves.toMatchObject({
              data: {
                PostsPinnedCounts: {
                  maxPinnedPosts: 3,
                  currentlyPinnedPosts: 2,
                },
              },
            })
          })

          describe('third post', () => {
            beforeEach(async () => {
              variables = { ...variables, id: 'third-post' }
              result = await mutate({ mutation: pinPostMutation, variables })
            })

            it('pins the second post', () => {
              expect(result).toMatchObject({
                data: {
                  pinPost: {
                    id: 'third-post',
                    pinned: true,
                    pinnedAt: expect.any(String),
                    pinnedBy: {
                      id: 'current-user',
                    },
                  },
                },
              })
            })

            it('returns the correct counts', async () => {
              await expect(
                query({
                  query: postsPinnedCountsQuery,
                }),
              ).resolves.toMatchObject({
                data: {
                  PostsPinnedCounts: {
                    maxPinnedPosts: 3,
                    currentlyPinnedPosts: 3,
                  },
                },
              })
            })

            describe('another post', () => {
              beforeEach(async () => {
                variables = { ...variables, id: 'another-post' }
                result = await mutate({ mutation: pinPostMutation, variables })
              })

              it('throws with max pinned posts is reached', () => {
                expect(result).toMatchObject({
                  data: { pinPost: null },
                  errors: [{ message: 'Max number of pinned posts is reached!' }],
                })
              })
            })

            describe('post ordering', () => {
              beforeEach(() => {
                // this is the ordering in the frontend
                variables = { orderBy: ['pinned_asc', 'createdAt_desc'] }
              })

              it('places the pinned posts first, though they are much older', async () => {
                await expect(query({ query: Post, variables })).resolves.toMatchObject({
                  data: {
                    Post: [
                      {
                        id: 'first-post',
                        pinned: true,
                        pinnedAt: expect.any(String),
                        createdAt: '2019-10-22T17:26:29.070Z',
                      },
                      {
                        id: 'second-post',
                        pinned: true,
                        pinnedAt: expect.any(String),
                        createdAt: '2018-10-22T17:26:29.070Z',
                      },
                      {
                        id: 'third-post',
                        pinned: true,
                        pinnedAt: expect.any(String),
                        createdAt: '2017-10-22T17:26:29.070Z',
                      },
                      {
                        id: 'another-post',
                        pinned: null,
                        pinnedAt: null,
                        createdAt: expect.any(String),
                      },
                      {
                        id: 'p9876',
                        pinned: null,
                        pinnedAt: null,
                        createdAt: expect.any(String),
                      },
                    ],
                  },
                  errors: undefined,
                })
              })
            })
          })
        })
      })
    })
  })
})

describe('unpin posts', () => {
  let pinnedPost
  const unpinPostMutation = gql`
    mutation ($id: ID!) {
      unpinPost(id: $id) {
        id
        title
        content
        author {
          name
          slug
        }
        pinnedBy {
          id
          name
          role
        }
        createdAt
        updatedAt
        pinned
        pinnedAt
      }
    }
  `
  beforeEach(async () => {
    pinnedPost = await Factory.build('post', { id: 'post-to-be-unpinned' })
    variables = {
      id: 'post-to-be-unpinned',
    }
  })

  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      authenticatedUser = null
      await expect(mutate({ mutation: unpinPostMutation, variables })).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { unpinPost: null },
      })
    })
  })

  describe('users cannot unpin posts', () => {
    it('throws authorization error', async () => {
      await expect(mutate({ mutation: unpinPostMutation, variables })).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { unpinPost: null },
      })
    })
  })

  describe('moderators cannot unpin posts', () => {
    let moderator
    beforeEach(async () => {
      moderator = await user.update({ role: 'moderator', updatedAt: new Date().toISOString() })
      authenticatedUser = await moderator.toJson()
    })

    it('throws authorization error', async () => {
      await expect(mutate({ mutation: unpinPostMutation, variables })).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { unpinPost: null },
      })
    })
  })

  describe('admin can unpin posts', () => {
    let admin
    beforeEach(async () => {
      admin = await user.update({
        role: 'admin',
        name: 'Admin',
        updatedAt: new Date().toISOString(),
      })
      authenticatedUser = await admin.toJson()
      await admin.relateTo(pinnedPost, 'pinned', { createdAt: new Date().toISOString() })
    })

    it('responds with the unpinned Post', async () => {
      authenticatedUser = await admin.toJson()
      const expected = {
        data: {
          unpinPost: {
            id: 'post-to-be-unpinned',
            pinnedBy: null,
            pinnedAt: null,
          },
        },
        errors: undefined,
      }

      await expect(mutate({ mutation: unpinPostMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })

    it('unsets `pinned` property', async () => {
      const expected = {
        data: {
          unpinPost: {
            id: 'post-to-be-unpinned',
            pinned: null,
          },
        },
        errors: undefined,
      }
      await expect(mutate({ mutation: unpinPostMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })
  })
})

describe('DeletePost', () => {
  let author
  const deletePostMutation = gql`
    mutation ($id: ID!) {
      DeletePost(id: $id) {
        id
        deleted
        content
        contentExcerpt
        image {
          url
        }
        comments {
          deleted
          content
          contentExcerpt
        }
      }
    }
  `

  beforeEach(async () => {
    author = await Factory.build('user')
    await Factory.build(
      'post',
      {
        id: 'p4711',
        title: 'I will be deleted',
        content: 'To be deleted',
      },
      {
        image: Factory.build('image', {
          url: 'http://localhost/path/to/some/image',
        }),
        author,
        categoryIds,
      },
    )
    variables = { ...variables, id: 'p4711' }
  })

  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      const { errors } = await mutate({ mutation: deletePostMutation, variables })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })
  })

  describe('authenticated but not the author', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    it('throws authorization error', async () => {
      const { errors } = await mutate({ mutation: deletePostMutation, variables })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })
  })

  describe('authenticated as author', () => {
    beforeEach(async () => {
      authenticatedUser = await author.toJson()
    })

    it('marks the post as deleted and blacks out attributes', async () => {
      const expected = {
        data: {
          DeletePost: {
            id: 'p4711',
            deleted: true,
            content: 'UNAVAILABLE',
            contentExcerpt: 'UNAVAILABLE',
            image: null,
            comments: [],
          },
        },
      }
      await expect(mutate({ mutation: deletePostMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })

    describe('if there are comments on the post', () => {
      beforeEach(async () => {
        await Factory.build(
          'comment',
          {
            content: 'to be deleted comment content',
            contentExcerpt: 'to be deleted comment content',
          },
          {
            postId: 'p4711',
          },
        )
      })

      it('marks the comments as deleted', async () => {
        const expected = {
          data: {
            DeletePost: {
              id: 'p4711',
              deleted: true,
              content: 'UNAVAILABLE',
              contentExcerpt: 'UNAVAILABLE',
              image: null,
              comments: [
                {
                  deleted: true,
                  // Should we black out the comment content in the database, too?
                  content: 'UNAVAILABLE',
                  contentExcerpt: 'UNAVAILABLE',
                },
              ],
            },
          },
        }
        await expect(mutate({ mutation: deletePostMutation, variables })).resolves.toMatchObject(
          expected,
        )
      })
    })
  })
})

describe('emotions', () => {
  let author, postToEmote
  const PostsEmotionsCountQuery = gql`
    query ($id: ID!) {
      Post(id: $id) {
        emotionsCount
      }
    }
  `
  const PostsEmotionsQuery = gql`
    query ($id: ID!) {
      Post(id: $id) {
        emotions {
          emotion
          User {
            id
          }
        }
      }
    }
  `

  beforeEach(async () => {
    author = await database.neode.create('User', { id: 'u257' })
    postToEmote = await Factory.build(
      'post',
      {
        id: 'p1376',
      },
      {
        author,
        categoryIds,
      },
    )

    variables = {
      ...variables,
      to: { id: 'p1376' },
      data: { emotion: 'happy' },
    }
  })

  describe('AddPostEmotions', () => {
    const addPostEmotionsMutation = gql`
      mutation ($to: _PostInput!, $data: _EMOTEDInput!) {
        AddPostEmotions(to: $to, data: $data) {
          from {
            id
          }
          to {
            id
          }
          emotion
        }
      }
    `
    let postsEmotionsQueryVariables

    beforeEach(() => {
      postsEmotionsQueryVariables = { id: 'p1376' }
    })

    describe('unauthenticated', () => {
      beforeEach(() => {
        authenticatedUser = null
      })

      it('throws authorization error', async () => {
        const addPostEmotions = await mutate({
          mutation: addPostEmotionsMutation,
          variables,
        })

        expect(addPostEmotions.errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated and not the author', () => {
      beforeEach(async () => {
        authenticatedUser = await user.toJson()
      })

      it('adds an emotion to the post', async () => {
        const expected = {
          data: {
            AddPostEmotions: {
              from: { id: 'current-user' },
              to: { id: 'p1376' },
              emotion: 'happy',
            },
          },
        }
        await expect(mutate({ mutation: addPostEmotionsMutation, variables })).resolves.toEqual(
          expect.objectContaining(expected),
        )
      })

      it('limits the addition of the same emotion to 1', async () => {
        const expected = {
          data: {
            Post: [
              {
                emotionsCount: 1,
              },
            ],
          },
        }
        await mutate({ mutation: addPostEmotionsMutation, variables })
        await mutate({ mutation: addPostEmotionsMutation, variables })
        await expect(
          query({ query: PostsEmotionsCountQuery, variables: postsEmotionsQueryVariables }),
        ).resolves.toEqual(expect.objectContaining(expected))
      })

      it('allows a user to add more than one emotion', async () => {
        const expected = {
          data: {
            Post: [
              {
                emotions: expect.arrayContaining([
                  { emotion: 'happy', User: { id: 'current-user' } },
                  { emotion: 'surprised', User: { id: 'current-user' } },
                ]),
              },
            ],
          },
        }
        await mutate({ mutation: addPostEmotionsMutation, variables })
        variables = { ...variables, data: { emotion: 'surprised' } }
        await mutate({ mutation: addPostEmotionsMutation, variables })
        await expect(
          query({ query: PostsEmotionsQuery, variables: postsEmotionsQueryVariables }),
        ).resolves.toEqual(expect.objectContaining(expected))
      })
    })

    describe('authenticated as author', () => {
      beforeEach(async () => {
        authenticatedUser = await author.toJson()
      })

      it('adds an emotion to the post', async () => {
        const expected = {
          data: {
            AddPostEmotions: {
              from: { id: 'u257' },
              to: { id: 'p1376' },
              emotion: 'happy',
            },
          },
        }
        await expect(mutate({ mutation: addPostEmotionsMutation, variables })).resolves.toEqual(
          expect.objectContaining(expected),
        )
      })
    })
  })

  describe('RemovePostEmotions', () => {
    let removePostEmotionsVariables, postsEmotionsQueryVariables
    const removePostEmotionsMutation = gql`
      mutation ($to: _PostInput!, $data: _EMOTEDInput!) {
        RemovePostEmotions(to: $to, data: $data) {
          from {
            id
          }
          to {
            id
          }
          emotion
        }
      }
    `
    beforeEach(async () => {
      await author.relateTo(postToEmote, 'emoted', { emotion: 'happy' })
      await user.relateTo(postToEmote, 'emoted', { emotion: 'cry' })

      postsEmotionsQueryVariables = { id: 'p1376' }
      removePostEmotionsVariables = {
        to: { id: 'p1376' },
        data: { emotion: 'cry' },
      }
    })

    describe('unauthenticated', () => {
      beforeEach(() => {
        authenticatedUser = null
      })

      it('throws authorization error', async () => {
        const removePostEmotions = await mutate({
          mutation: removePostEmotionsMutation,
          variables: removePostEmotionsVariables,
        })
        expect(removePostEmotions.errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated', () => {
      describe('but not the emoter', () => {
        beforeEach(async () => {
          authenticatedUser = await author.toJson()
        })

        it('returns null if the emotion could not be found', async () => {
          const removePostEmotions = await mutate({
            mutation: removePostEmotionsMutation,
            variables: removePostEmotionsVariables,
          })
          expect(removePostEmotions).toEqual(
            expect.objectContaining({ data: { RemovePostEmotions: null } }),
          )
        })
      })

      describe('as the emoter', () => {
        beforeEach(async () => {
          authenticatedUser = await user.toJson()
        })

        it('removes an emotion from a post', async () => {
          const expected = {
            data: {
              RemovePostEmotions: {
                to: { id: 'p1376' },
                from: { id: 'current-user' },
                emotion: 'cry',
              },
            },
          }
          await expect(
            mutate({
              mutation: removePostEmotionsMutation,
              variables: removePostEmotionsVariables,
            }),
          ).resolves.toEqual(expect.objectContaining(expected))
        })

        it('removes only the requested emotion, not all emotions', async () => {
          const expectedEmotions = [{ emotion: 'happy', User: { id: 'u257' } }]
          const expectedResponse = {
            data: { Post: [{ emotions: expect.arrayContaining(expectedEmotions) }] },
          }
          await mutate({
            mutation: removePostEmotionsMutation,
            variables: removePostEmotionsVariables,
          })
          await expect(
            query({ query: PostsEmotionsQuery, variables: postsEmotionsQueryVariables }),
          ).resolves.toEqual(expect.objectContaining(expectedResponse))
        })
      })
    })
  })

  describe('posts emotions count', () => {
    let PostsEmotionsCountByEmotionVariables
    let PostsEmotionsByCurrentUserVariables

    const PostsEmotionsCountByEmotionQuery = gql`
      query ($postId: ID!, $data: _EMOTEDInput!) {
        PostsEmotionsCountByEmotion(postId: $postId, data: $data)
      }
    `

    const PostsEmotionsByCurrentUserQuery = gql`
      query ($postId: ID!) {
        PostsEmotionsByCurrentUser(postId: $postId)
      }
    `
    beforeEach(async () => {
      await user.relateTo(postToEmote, 'emoted', { emotion: 'cry' })

      PostsEmotionsCountByEmotionVariables = {
        postId: 'p1376',
        data: { emotion: 'cry' },
      }
      PostsEmotionsByCurrentUserVariables = { postId: 'p1376' }
    })

    describe('PostsEmotionsCountByEmotion', () => {
      it("returns a post's emotions count", async () => {
        const expectedResponse = { data: { PostsEmotionsCountByEmotion: 1 } }
        await expect(
          query({
            query: PostsEmotionsCountByEmotionQuery,
            variables: PostsEmotionsCountByEmotionVariables,
          }),
        ).resolves.toEqual(expect.objectContaining(expectedResponse))
      })
    })

    describe('PostsEmotionsByCurrentUser', () => {
      describe('authenticated', () => {
        beforeEach(async () => {
          authenticatedUser = await user.toJson()
        })

        it("returns a currentUser's emotions on a post", async () => {
          const expectedResponse = { data: { PostsEmotionsByCurrentUser: ['cry'] } }
          await expect(
            query({
              query: PostsEmotionsByCurrentUserQuery,
              variables: PostsEmotionsByCurrentUserVariables,
            }),
          ).resolves.toEqual(expect.objectContaining(expectedResponse))
        })
      })
    })
  })
})
