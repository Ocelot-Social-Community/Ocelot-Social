import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import { createGroupMutation } from '../../db/graphql/mutations'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'

const driver = getDriver()
const neode = getNeode()

// Wolle: let query
let mutate
let authenticatedUser
let user

const categoryIds = ['cat9', 'cat4', 'cat15']
let variables = {}

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        driver,
        neode,
        user: authenticatedUser,
      }
    },
  })
  // Wolle: query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
})

beforeEach(async () => {
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
    neode.create('Category', {
      id: 'cat9',
      name: 'Democracy & Politics',
      icon: 'university',
    }),
    neode.create('Category', {
      id: 'cat4',
      name: 'Environment & Nature',
      icon: 'tree',
    }),
    neode.create('Category', {
      id: 'cat15',
      name: 'Consumption & Sustainability',
      icon: 'shopping-cart',
    }),
    neode.create('Category', {
      id: 'cat27',
      name: 'Animal Protection',
      icon: 'paw',
    }),
  ])
  authenticatedUser = null
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

// describe('Group', () => {
//   describe('can be filtered', () => {
//     let followedUser, happyPost, cryPost
//     beforeEach(async () => {
//       ;[followedUser] = await Promise.all([
//         Factory.build(
//           'user',
//           {
//             id: 'followed-by-me',
//             name: 'Followed User',
//           },
//           {
//             email: 'followed@example.org',
//             password: '1234',
//           },
//         ),
//       ])
//       ;[happyPost, cryPost] = await Promise.all([
//         Factory.build('post', { id: 'happy-post' }, { categoryIds: ['cat4'] }),
//         Factory.build('post', { id: 'cry-post' }, { categoryIds: ['cat15'] }),
//         Factory.build(
//           'post',
//           {
//             id: 'post-by-followed-user',
//           },
//           {
//             categoryIds: ['cat9'],
//             author: followedUser,
//           },
//         ),
//       ])
//     })

//     describe('no filter', () => {
//       it('returns all posts', async () => {
//         const postQueryNoFilters = gql`
//           query Post($filter: _PostFilter) {
//             Post(filter: $filter) {
//               id
//             }
//           }
//         `
//         const expected = [{ id: 'happy-post' }, { id: 'cry-post' }, { id: 'post-by-followed-user' }]
//         variables = { filter: {} }
//         await expect(query({ query: postQueryNoFilters, variables })).resolves.toMatchObject({
//           data: {
//             Post: expect.arrayContaining(expected),
//           },
//         })
//       })
//     })

//     /* it('by categories', async () => {
//       const postQueryFilteredByCategories = gql`
//         query Post($filter: _PostFilter) {
//           Post(filter: $filter) {
//             id
//             categories {
//               id
//             }
//           }
//         }
//       `
//       const expected = {
//         data: {
//           Post: [
//             {
//               id: 'post-by-followed-user',
//               categories: [{ id: 'cat9' }],
//             },
//           ],
//         },
//       }
//       variables = { ...variables, filter: { categories_some: { id_in: ['cat9'] } } }
//       await expect(
//         query({ query: postQueryFilteredByCategories, variables }),
//       ).resolves.toMatchObject(expected)
//     }) */

//     describe('by emotions', () => {
//       const postQueryFilteredByEmotions = gql`
//         query Post($filter: _PostFilter) {
//           Post(filter: $filter) {
//             id
//             emotions {
//               emotion
//             }
//           }
//         }
//       `

//       it('filters by single emotion', async () => {
//         const expected = {
//           data: {
//             Post: [
//               {
//                 id: 'happy-post',
//                 emotions: [{ emotion: 'happy' }],
//               },
//             ],
//           },
//         }
//         await user.relateTo(happyPost, 'emoted', { emotion: 'happy' })
//         variables = { ...variables, filter: { emotions_some: { emotion_in: ['happy'] } } }
//         await expect(
//           query({ query: postQueryFilteredByEmotions, variables }),
//         ).resolves.toMatchObject(expected)
//       })

//       it('filters by multiple emotions', async () => {
//         const expected = [
//           {
//             id: 'happy-post',
//             emotions: [{ emotion: 'happy' }],
//           },
//           {
//             id: 'cry-post',
//             emotions: [{ emotion: 'cry' }],
//           },
//         ]
//         await user.relateTo(happyPost, 'emoted', { emotion: 'happy' })
//         await user.relateTo(cryPost, 'emoted', { emotion: 'cry' })
//         variables = { ...variables, filter: { emotions_some: { emotion_in: ['happy', 'cry'] } } }
//         await expect(
//           query({ query: postQueryFilteredByEmotions, variables }),
//         ).resolves.toMatchObject({
//           data: {
//             Post: expect.arrayContaining(expected),
//           },
//           errors: undefined,
//         })
//       })
//     })

//     it('by followed-by', async () => {
//       const postQueryFilteredByUsersFollowed = gql`
//         query Post($filter: _PostFilter) {
//           Post(filter: $filter) {
//             id
//             author {
//               id
//               name
//             }
//           }
//         }
//       `

//       await user.relateTo(followedUser, 'following')
//       variables = { filter: { author: { followedBy_some: { id: 'current-user' } } } }
//       await expect(
//         query({ query: postQueryFilteredByUsersFollowed, variables }),
//       ).resolves.toMatchObject({
//         data: {
//           Post: [
//             {
//               id: 'post-by-followed-user',
//               author: { id: 'followed-by-me', name: 'Followed User' },
//             },
//           ],
//         },
//         errors: undefined,
//       })
//     })
//   })
// })

describe('CreateGroup', () => {
  beforeEach(() => {
    variables = {
      ...variables,
      id: 'g589',
      name: 'The Best Group',
      slug: 'the-group',
      about: 'We will change the world!',
      categoryIds,
    }
  })

  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      const { errors } = await mutate({ mutation: createGroupMutation, variables })
      expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    it('creates a group', async () => {
      const expected = {
        data: {
          CreateGroup: {
            // Wolle: id: 'g589',
            name: 'The Best Group',
            slug: 'the-group',
            about: 'We will change the world!',
          },
        },
        errors: undefined,
      }
      await expect(mutate({ mutation: createGroupMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })

    it('assigns the authenticated user as owner', async () => {
      const expected = {
        data: {
          CreateGroup: {
            name: 'The Best Group',
            owner: {
              name: 'TestUser',
            },
          },
        },
        errors: undefined,
      }
      await expect(mutate({ mutation: createGroupMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })

    it('`disabled` and `deleted` default to `false`', async () => {
      const expected = { data: { CreateGroup: { disabled: false, deleted: false } } }
      await expect(mutate({ mutation: createGroupMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })
  })
})

// describe('UpdatePost', () => {
//   let author, newlyCreatedPost
//   const updatePostMutation = gql`
//     mutation ($id: ID!, $title: String!, $content: String!, $image: ImageInput) {
//       UpdatePost(id: $id, title: $title, content: $content, image: $image) {
//         id
//         title
//         content
//         author {
//           name
//           slug
//         }
//         createdAt
//         updatedAt
//       }
//     }
//   `
//   beforeEach(async () => {
//     author = await Factory.build('user', { slug: 'the-author' })
//     newlyCreatedPost = await Factory.build(
//       'post',
//       {
//         id: 'p9876',
//         title: 'Old title',
//         content: 'Old content',
//       },
//       {
//         author,
//         categoryIds,
//       },
//     )

//     variables = {
//       id: 'p9876',
//       title: 'New title',
//       content: 'New content',
//     }
//   })

//   describe('unauthenticated', () => {
//     it('throws authorization error', async () => {
//       authenticatedUser = null
//       expect(mutate({ mutation: updatePostMutation, variables })).resolves.toMatchObject({
//         errors: [{ message: 'Not Authorised!' }],
//         data: { UpdatePost: null },
//       })
//     })
//   })

//   describe('authenticated but not the author', () => {
//     beforeEach(async () => {
//       authenticatedUser = await user.toJson()
//     })

//     it('throws authorization error', async () => {
//       const { errors } = await mutate({ mutation: updatePostMutation, variables })
//       expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
//     })
//   })

//   describe('authenticated as author', () => {
//     beforeEach(async () => {
//       authenticatedUser = await author.toJson()
//     })

//     it('updates a post', async () => {
//       const expected = {
//         data: { UpdatePost: { id: 'p9876', content: 'New content' } },
//         errors: undefined,
//       }
//       await expect(mutate({ mutation: updatePostMutation, variables })).resolves.toMatchObject(
//         expected,
//       )
//     })

//     it('updates a post, but maintains non-updated attributes', async () => {
//       const expected = {
//         data: {
//           UpdatePost: { id: 'p9876', content: 'New content', createdAt: expect.any(String) },
//         },
//         errors: undefined,
//       }
//       await expect(mutate({ mutation: updatePostMutation, variables })).resolves.toMatchObject(
//         expected,
//       )
//     })

//     it('updates the updatedAt attribute', async () => {
//       newlyCreatedPost = await newlyCreatedPost.toJson()
//       const {
//         data: { UpdatePost },
//       } = await mutate({ mutation: updatePostMutation, variables })
//       expect(newlyCreatedPost.updatedAt).toBeTruthy()
//       expect(Date.parse(newlyCreatedPost.updatedAt)).toEqual(expect.any(Number))
//       expect(UpdatePost.updatedAt).toBeTruthy()
//       expect(Date.parse(UpdatePost.updatedAt)).toEqual(expect.any(Number))
//       expect(newlyCreatedPost.updatedAt).not.toEqual(UpdatePost.updatedAt)
//     })

//     /* describe('no new category ids provided for update', () => {
//       it('resolves and keeps current categories', async () => {
//         const expected = {
//           data: {
//             UpdatePost: {
//               id: 'p9876',
//               categories: expect.arrayContaining([{ id: 'cat9' }, { id: 'cat4' }, { id: 'cat15' }]),
//             },
//           },
//           errors: undefined,
//         }
//         await expect(mutate({ mutation: updatePostMutation, variables })).resolves.toMatchObject(
//           expected,
//         )
//       })
//     }) */

//     /* describe('given category ids', () => {
//       beforeEach(() => {
//         variables = { ...variables, categoryIds: ['cat27'] }
//       })

//       it('updates categories of a post', async () => {
//         const expected = {
//           data: {
//             UpdatePost: {
//               id: 'p9876',
//               categories: expect.arrayContaining([{ id: 'cat27' }]),
//             },
//           },
//           errors: undefined,
//         }
//         await expect(mutate({ mutation: updatePostMutation, variables })).resolves.toMatchObject(
//           expected,
//         )
//       })
//     }) */

//     describe('params.image', () => {
//       describe('is object', () => {
//         beforeEach(() => {
//           variables = { ...variables, image: { sensitive: true } }
//         })
//         it('updates the image', async () => {
//           await expect(neode.first('Image', { sensitive: true })).resolves.toBeFalsy()
//           await mutate({ mutation: updatePostMutation, variables })
//           await expect(neode.first('Image', { sensitive: true })).resolves.toBeTruthy()
//         })
//       })

//       describe('is null', () => {
//         beforeEach(() => {
//           variables = { ...variables, image: null }
//         })
//         it('deletes the image', async () => {
//           await expect(neode.all('Image')).resolves.toHaveLength(6)
//           await mutate({ mutation: updatePostMutation, variables })
//           await expect(neode.all('Image')).resolves.toHaveLength(5)
//         })
//       })

//       describe('is undefined', () => {
//         beforeEach(() => {
//           delete variables.image
//         })
//         it('keeps the image unchanged', async () => {
//           await expect(neode.first('Image', { sensitive: true })).resolves.toBeFalsy()
//           await mutate({ mutation: updatePostMutation, variables })
//           await expect(neode.first('Image', { sensitive: true })).resolves.toBeFalsy()
//         })
//       })
//     })
//   })
// })

// describe('DeletePost', () => {
//   let author
//   const deletePostMutation = gql`
//     mutation ($id: ID!) {
//       DeletePost(id: $id) {
//         id
//         deleted
//         content
//         contentExcerpt
//         image {
//           url
//         }
//         comments {
//           deleted
//           content
//           contentExcerpt
//         }
//       }
//     }
//   `

//   beforeEach(async () => {
//     author = await Factory.build('user')
//     await Factory.build(
//       'post',
//       {
//         id: 'p4711',
//         title: 'I will be deleted',
//         content: 'To be deleted',
//       },
//       {
//         image: Factory.build('image', {
//           url: 'path/to/some/image',
//         }),
//         author,
//         categoryIds,
//       },
//     )
//     variables = { ...variables, id: 'p4711' }
//   })

//   describe('unauthenticated', () => {
//     it('throws authorization error', async () => {
//       const { errors } = await mutate({ mutation: deletePostMutation, variables })
//       expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
//     })
//   })

//   describe('authenticated but not the author', () => {
//     beforeEach(async () => {
//       authenticatedUser = await user.toJson()
//     })

//     it('throws authorization error', async () => {
//       const { errors } = await mutate({ mutation: deletePostMutation, variables })
//       expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
//     })
//   })

//   describe('authenticated as author', () => {
//     beforeEach(async () => {
//       authenticatedUser = await author.toJson()
//     })

//     it('marks the post as deleted and blacks out attributes', async () => {
//       const expected = {
//         data: {
//           DeletePost: {
//             id: 'p4711',
//             deleted: true,
//             content: 'UNAVAILABLE',
//             contentExcerpt: 'UNAVAILABLE',
//             image: null,
//             comments: [],
//           },
//         },
//       }
//       await expect(mutate({ mutation: deletePostMutation, variables })).resolves.toMatchObject(
//         expected,
//       )
//     })

//     describe('if there are comments on the post', () => {
//       beforeEach(async () => {
//         await Factory.build(
//           'comment',
//           {
//             content: 'to be deleted comment content',
//             contentExcerpt: 'to be deleted comment content',
//           },
//           {
//             postId: 'p4711',
//           },
//         )
//       })

//       it('marks the comments as deleted', async () => {
//         const expected = {
//           data: {
//             DeletePost: {
//               id: 'p4711',
//               deleted: true,
//               content: 'UNAVAILABLE',
//               contentExcerpt: 'UNAVAILABLE',
//               image: null,
//               comments: [
//                 {
//                   deleted: true,
//                   // Should we black out the comment content in the database, too?
//                   content: 'UNAVAILABLE',
//                   contentExcerpt: 'UNAVAILABLE',
//                 },
//               ],
//             },
//           },
//         }
//         await expect(mutate({ mutation: deletePostMutation, variables })).resolves.toMatchObject(
//           expected,
//         )
//       })
//     })
//   })
// })
