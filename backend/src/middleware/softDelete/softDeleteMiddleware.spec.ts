/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Factory, { cleanDatabase } from '@db/factories'
import { Post } from '@graphql/queries/Post'
import { User } from '@graphql/queries/User'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

const categoryIds = ['cat9']
let moderator
let user
let troll
let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup({ context })
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server

  // For performance reasons we do this only once
  const avatar = await Factory.build('image', {
    url: 'http://localhost/some/offensive/avatar.jpg',
  })
  const users = await Promise.all([
    Factory.build('user', { id: 'u1', role: 'user' }),
    Factory.build(
      'user',
      {
        id: 'm1',
        role: 'moderator',
      },
      {
        password: '1234',
      },
    ),
    Factory.build(
      'user',
      {
        id: 'u2',
        role: 'user',
        name: 'Offensive Name',
        slug: 'offensive-name',
        about: 'This self description is very offensive',
      },
      {
        avatar,
      },
    ),
    database.neode.create('Category', {
      id: 'cat9',
      name: 'Democracy & Politics',
      icon: 'university',
    }),
  ])

  user = users[0]
  moderator = users[1]
  troll = users[2]

  await Promise.all([
    user.relateTo(troll, 'following'),
    Factory.build(
      'post',
      {
        id: 'p1',
        title: 'Deleted post',
        slug: 'deleted-post',
        deleted: true,
      },
      {
        author: user,
        categoryIds,
      },
    ),
    Factory.build(
      'post',
      {
        id: 'p3',
        title: 'Publicly visible post',
        slug: 'publicly-visible-post',
        deleted: false,
      },
      {
        author: user,
        categoryIds,
      },
    ),
  ])

  const resources = await Promise.all([
    Factory.build(
      'comment',
      {
        id: 'c2',
        content: 'Enabled comment on public post',
      },
      {
        author: user,
        postId: 'p3',
      },
    ),
    Factory.build(
      'post',
      {
        id: 'p2',
        title: 'Disabled post',
        content: 'This is an offensive post content',
        contentExcerpt: 'This is an offensive post content',
        deleted: false,
      },
      {
        image: Factory.build('image', {
          url: 'http://localhost/some/offensive/image.jpg',
        }),
        author: troll,
        categoryIds,
      },
    ),
    Factory.build(
      'comment',
      {
        id: 'c1',
        content: 'Disabled comment',
        contentExcerpt: 'Disabled comment',
      },
      {
        author: troll,
        postId: 'p3',
      },
    ),
  ])

  const trollingPost = resources[1]
  const trollingComment = resources[2]

  const reports = await Promise.all([
    Factory.build('report'),
    Factory.build('report'),
    Factory.build('report'),
  ])
  const reportAgainstTroll = reports[0]
  const reportAgainstTrollingPost = reports[1]
  const reportAgainstTrollingComment = reports[2]

  const reportVariables = {
    resourceId: 'undefined-resource',
    reasonCategory: 'discrimination_etc',
    reasonDescription: 'I am what I am !!!',
  }

  await Promise.all([
    reportAgainstTroll.relateTo(user, 'filed', { ...reportVariables, resourceId: 'u2' }),
    reportAgainstTroll.relateTo(troll, 'belongsTo'),
    reportAgainstTrollingPost.relateTo(user, 'filed', { ...reportVariables, resourceId: 'p2' }),
    reportAgainstTrollingPost.relateTo(trollingPost, 'belongsTo'),
    reportAgainstTrollingComment.relateTo(moderator, 'filed', {
      ...reportVariables,
      resourceId: 'c1',
    }),
    reportAgainstTrollingComment.relateTo(trollingComment, 'belongsTo'),
  ])

  const disableVariables = {
    resourceId: 'undefined-resource',
    disable: true,
    closed: false,
  }

  await Promise.all([
    reportAgainstTroll.relateTo(moderator, 'reviewed', { ...disableVariables, resourceId: 'u2' }),
    troll.update({ disabled: true, updatedAt: new Date().toISOString() }),
    reportAgainstTrollingPost.relateTo(moderator, 'reviewed', {
      ...disableVariables,
      resourceId: 'p2',
    }),
    trollingPost.update({ disabled: true, updatedAt: new Date().toISOString() }),
    reportAgainstTrollingComment.relateTo(moderator, 'reviewed', {
      ...disableVariables,
      resourceId: 'c1',
    }),
    trollingComment.update({ disabled: true, updatedAt: new Date().toISOString() }),
  ])
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe('softDeleteMiddleware', () => {
  describe('read disabled content', () => {
    let subject
    const beforeComment = async () => {
      const { data } = await query({ query: User, variables: { id: 'u1' } })
      subject = (data as any).User[0].following[0].comments[0]
    }
    const beforeUser = async () => {
      const { data } = await query({ query: User, variables: { id: 'u1' } })
      subject = (data as any).User[0].following[0]
    }
    const beforePost = async () => {
      const { data } = await query({ query: User, variables: { id: 'u1' } })
      subject = (data as any).User[0].following[0].contributions[0]
    }

    describe('as moderator', () => {
      beforeEach(async () => {
        authenticatedUser = await moderator.toJson()
      })

      describe('User', () => {
        beforeEach(beforeUser)

        it('displays name', () => expect(subject.name).toEqual('Offensive Name'))
        it('displays slug', () => expect(subject.slug).toEqual('offensive-name'))
        it('displays about', () =>
          expect(subject.about).toEqual('This self description is very offensive'))
        it('displays avatar', async () => {
          expect(subject.avatar).toEqual({
            url: expect.stringMatching('http://localhost/some/offensive/avatar.jpg'),
          })
        })
      })

      describe('Post', () => {
        beforeEach(beforePost)

        it('displays title', () => expect(subject.title).toEqual('Disabled post'))
        it('displays slug', () => expect(subject.slug).toEqual('disabled-post'))
        it('displays content', () =>
          expect(subject.content).toEqual('This is an offensive post content'))
        it('displays contentExcerpt', () =>
          expect(subject.contentExcerpt).toEqual('This is an offensive post content'))
        it('displays image', () =>
          expect(subject.image).toEqual({
            url: expect.stringMatching('http://localhost/some/offensive/image.jpg'),
          }))
      })

      describe('Comment', () => {
        beforeEach(beforeComment)

        it('displays content', () => expect(subject.content).toEqual('Disabled comment'))
        it('displays contentExcerpt', () =>
          expect(subject.contentExcerpt).toEqual('Disabled comment'))
      })
    })

    describe('as user', () => {
      beforeEach(async () => {
        authenticatedUser = await user.toJson()
      })

      describe('User', () => {
        beforeEach(beforeUser)

        it('obfuscates name', () => expect(subject.name).toEqual('UNAVAILABLE'))
        it('obfuscates slug', () => expect(subject.slug).toEqual('UNAVAILABLE'))
        it('obfuscates about', () => expect(subject.about).toEqual('UNAVAILABLE'))
        it('obfuscates avatar', () => expect(subject.avatar).toEqual(null))
      })

      describe('Post', () => {
        beforeEach(beforePost)

        it('obfuscates title', () => expect(subject.title).toEqual('UNAVAILABLE'))
        it('obfuscates slug', () => expect(subject.slug).toEqual('UNAVAILABLE'))
        it('obfuscates content', () => expect(subject.content).toEqual('UNAVAILABLE'))
        it('obfuscates contentExcerpt', () => expect(subject.contentExcerpt).toEqual('UNAVAILABLE'))
        it('obfuscates image', () => expect(subject.image).toEqual(null))
      })

      describe('Comment', () => {
        beforeEach(beforeComment)

        it('obfuscates content', () => expect(subject.content).toEqual('UNAVAILABLE'))
        it('obfuscates contentExcerpt', () => expect(subject.contentExcerpt).toEqual('UNAVAILABLE'))
      })
    })
  })

  describe('Query', () => {
    describe('Post', () => {
      describe('as user', () => {
        beforeEach(async () => {
          authenticatedUser = await user.toJson()
        })

        it('hides deleted or disabled posts', async () => {
          const expected = { data: { Post: [{ title: 'Publicly visible post' }] } }
          await expect(query({ query: Post })).resolves.toMatchObject(expected)
        })
      })

      describe('as moderator', () => {
        beforeEach(async () => {
          authenticatedUser = await moderator.toJson()
        })

        it('shows disabled but hides deleted posts', async () => {
          const expected = [{ title: 'Disabled post' }, { title: 'Publicly visible post' }]
          const { data } = await query({ query: Post })
          const { Post: PostData } = data as any
          expect(PostData).toEqual(expect.arrayContaining(expected))
        })
      })

      describe('.comments', () => {
        describe('as user', () => {
          beforeEach(async () => {
            authenticatedUser = await user.toJson()
          })

          it('conceals disabled comments', async () => {
            const expected = [
              { content: 'Enabled comment on public post' },
              { content: 'UNAVAILABLE' },
            ]
            const { data } = await query({ query: Post, variables: { id: 'p3' } })
            const {
              Post: [{ comments }],
            } = data as any
            expect(comments).toEqual(expect.arrayContaining(expected))
          })
        })

        describe('as moderator', () => {
          beforeEach(async () => {
            authenticatedUser = await moderator.toJson()
          })

          it('shows disabled comments', async () => {
            const expected = [
              { content: 'Enabled comment on public post' },
              { content: 'Disabled comment' },
            ]
            const { data } = await query({ query: Post, variables: { id: 'p3' } })
            const {
              Post: [{ comments }],
            } = data as any
            expect(comments).toEqual(expect.arrayContaining(expected))
          })
        })
      })
    })
  })
})
