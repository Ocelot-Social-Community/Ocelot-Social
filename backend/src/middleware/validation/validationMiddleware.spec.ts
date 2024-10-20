import gql from 'graphql-tag'
import Factory, { cleanDatabase } from '../../db/factories'
import { getNeode, getDriver } from '../../db/neo4j'
import { createTestClient } from 'apollo-server-testing'
import createServer from '../../server'
import { signupVerificationMutation } from '../../graphql/authentications'

const neode = getNeode()
const driver = getDriver()
let authenticatedUser,
  mutate,
  users,
  offensivePost,
  reportVariables,
  disableVariables,
  reportingUser,
  moderatingUser,
  commentingUser

const createCommentMutation = gql`
  mutation ($id: ID, $postId: ID!, $content: String!) {
    CreateComment(id: $id, postId: $postId, content: $content) {
      id
    }
  }
`
const updateCommentMutation = gql`
  mutation ($content: String!, $id: ID!) {
    UpdateComment(content: $content, id: $id) {
      id
    }
  }
`

const reportMutation = gql`
  mutation ($resourceId: ID!, $reasonCategory: ReasonCategory!, $reasonDescription: String!) {
    fileReport(
      resourceId: $resourceId
      reasonCategory: $reasonCategory
      reasonDescription: $reasonDescription
    ) {
      reportId
    }
  }
`
const reviewMutation = gql`
  mutation ($resourceId: ID!, $disable: Boolean, $closed: Boolean) {
    review(resourceId: $resourceId, disable: $disable, closed: $closed) {
      createdAt
      updatedAt
    }
  }
`
const updateUserMutation = gql`
  mutation ($id: ID!, $name: String, $slug: String) {
    UpdateUser(id: $id, name: $name, slug: $slug) {
      name
      slug
    }
  }
`

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        user: authenticatedUser,
        neode,
        driver,
      }
    },
  })
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

beforeEach(async () => {
  users = await Promise.all([
    Factory.build('user', {
      id: 'reporting-user',
    }),
    Factory.build('user', {
      id: 'moderating-user',
      role: 'moderator',
    }),
    Factory.build('user', {
      id: 'commenting-user',
    }),
  ])
  reportVariables = {
    resourceId: 'whatever',
    reasonCategory: 'other',
    reasonDescription: 'Violates code of conduct !!!',
  }
  disableVariables = {
    resourceId: 'undefined-resource',
    disable: true,
    closed: false,
  }
  reportingUser = users[0]
  moderatingUser = users[1]
  commentingUser = users[2]
  const posts = await Promise.all([
    Factory.build(
      'post',
      {
        id: 'offensive-post',
      },
      {
        authorId: 'moderating-user',
      },
    ),
    Factory.build(
      'post',
      {
        id: 'post-4-commenting',
      },
      {
        authorId: 'commenting-user',
      },
    ),
  ])
  offensivePost = posts[0]
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('validationMiddleware', () => {
  describe('CreateComment', () => {
    let createCommentVariables
    beforeEach(async () => {
      createCommentVariables = {
        postId: 'whatever',
        content: '',
      }
      authenticatedUser = await commentingUser.toJson()
    })

    it('throws an error if content is empty', async () => {
      createCommentVariables = { ...createCommentVariables, postId: 'post-4-commenting' }
      await expect(
        mutate({ mutation: createCommentMutation, variables: createCommentVariables }),
      ).resolves.toMatchObject({
        data: { CreateComment: null },
        errors: [{ message: 'Comment must be at least 1 character long!' }],
      })
    })

    it('sanitizes content and throws an error if not longer than 1 character', async () => {
      createCommentVariables = { postId: 'post-4-commenting', content: '<a></a>' }
      await expect(
        mutate({ mutation: createCommentMutation, variables: createCommentVariables }),
      ).resolves.toMatchObject({
        data: { CreateComment: null },
        errors: [{ message: 'Comment must be at least 1 character long!' }],
      })
    })

    it('throws an error if there is no post with given id in the database', async () => {
      createCommentVariables = {
        ...createCommentVariables,
        postId: 'non-existent-post',
        content: 'valid content',
      }
      await expect(
        mutate({ mutation: createCommentMutation, variables: createCommentVariables }),
      ).resolves.toMatchObject({
        data: { CreateComment: null },
        errors: [{ message: 'Comment cannot be created without a post!' }],
      })
    })

    describe('UpdateComment', () => {
      let updateCommentVariables
      beforeEach(async () => {
        await Factory.build(
          'comment',
          {
            id: 'comment-id',
          },
          {
            authorId: 'commenting-user',
          },
        )
        updateCommentVariables = {
          id: 'whatever',
          content: '',
        }
        authenticatedUser = await commentingUser.toJson()
      })

      it('throws an error if content is empty', async () => {
        updateCommentVariables = { ...updateCommentVariables, id: 'comment-id' }
        await expect(
          mutate({ mutation: updateCommentMutation, variables: updateCommentVariables }),
        ).resolves.toMatchObject({
          data: { UpdateComment: null },
          errors: [{ message: 'Comment must be at least 1 character long!' }],
        })
      })

      it('sanitizes content and throws an error if not longer than 1 character', async () => {
        updateCommentVariables = { id: 'comment-id', content: '<a></a>' }
        await expect(
          mutate({ mutation: updateCommentMutation, variables: updateCommentVariables }),
        ).resolves.toMatchObject({
          data: { UpdateComment: null },
          errors: [{ message: 'Comment must be at least 1 character long!' }],
        })
      })
    })
  })

  describe('Report', () => {
    it('throws an error if a user tries to report themself', async () => {
      authenticatedUser = await reportingUser.toJson()
      reportVariables = { ...reportVariables, resourceId: 'reporting-user' }
      await expect(
        mutate({ mutation: reportMutation, variables: reportVariables }),
      ).resolves.toMatchObject({
        data: { fileReport: null },
        errors: [{ message: 'You cannot report yourself!' }],
      })
    })
  })

  describe('Review', () => {
    beforeEach(async () => {
      const reportAgainstModerator = await Factory.build('report')
      await Promise.all([
        reportAgainstModerator.relateTo(reportingUser, 'filed', {
          ...reportVariables,
          resourceId: 'moderating-user',
        }),
        reportAgainstModerator.relateTo(moderatingUser, 'belongsTo'),
      ])
      authenticatedUser = await moderatingUser.toJson()
    })

    it('throws an error if a user tries to review a report against them', async () => {
      disableVariables = { ...disableVariables, resourceId: 'moderating-user' }
      await expect(
        mutate({ mutation: reviewMutation, variables: disableVariables }),
      ).resolves.toMatchObject({
        data: { review: null },
        errors: [{ message: 'You cannot review yourself!' }],
      })
    })

    it('throws an error for invaild resource', async () => {
      disableVariables = { ...disableVariables, resourceId: 'non-existent-resource' }
      await expect(
        mutate({ mutation: reviewMutation, variables: disableVariables }),
      ).resolves.toMatchObject({
        data: { review: null },
        errors: [{ message: 'Resource not found or is not a Post|Comment|User!' }],
      })
    })

    it('throws an error if no report exists', async () => {
      disableVariables = { ...disableVariables, resourceId: 'offensive-post' }
      await expect(
        mutate({ mutation: reviewMutation, variables: disableVariables }),
      ).resolves.toMatchObject({
        data: { review: null },
        errors: [{ message: 'Before starting the review process, please report the Post!' }],
      })
    })

    it('throws an error if a moderator tries to review their own resource(Post|Comment)', async () => {
      const reportAgainstOffensivePost = await Factory.build('report')
      await Promise.all([
        reportAgainstOffensivePost.relateTo(reportingUser, 'filed', {
          ...reportVariables,
          resourceId: 'offensive-post',
        }),
        reportAgainstOffensivePost.relateTo(offensivePost, 'belongsTo'),
      ])
      disableVariables = { ...disableVariables, resourceId: 'offensive-post' }
      await expect(
        mutate({ mutation: reviewMutation, variables: disableVariables }),
      ).resolves.toMatchObject({
        data: { review: null },
        errors: [{ message: 'You cannot review your own Post!' }],
      })
    })

    describe('moderate a resource that is not a (Comment|Post|User) ', () => {
      beforeEach(async () => {
        await Promise.all([Factory.build('tag', { id: 'tag-id' })])
      })

      it('returns null', async () => {
        disableVariables = {
          ...disableVariables,
          resourceId: 'tag-id',
        }
        await expect(
          mutate({ mutation: reviewMutation, variables: disableVariables }),
        ).resolves.toMatchObject({
          data: { review: null },
          errors: [{ message: 'Resource not found or is not a Post|Comment|User!' }],
        })
      })
    })
  })

  describe('SignupVerification', () => {
    let variables

    beforeEach(async () => {
      variables = {
        id: 'updating-user',
        name: 'John Doughnut',
        password: '1234',
        email: 'updating-user@example.org',
        nonce: '12345',
        termsAndConditionsAgreedVersion: '0.0.1',
      }
      await Factory.build('emailAddress', {
        email: 'updating-user@example.org',
        nonce: '12345',
        verifiedAt: null,
      })
    })

    describe('with name', () => {
      describe('is allowed', () => {
        it('has success', async () => {
          await expect(
            mutate({ mutation: signupVerificationMutation, variables }),
          ).resolves.toMatchObject({
            data: {
              SignupVerification: {
                name: 'John Doughnut',
                id: expect.any(String),
                slug: 'john-doughnut',
              },
            },
            errors: undefined,
          })
        })

        it('throws an error', async () => {
          variables = {
            ...variables,
            name: '  ',
          }
          await expect(
            mutate({ mutation: signupVerificationMutation, variables }),
          ).resolves.toMatchObject({
            data: { SignupVerification: null },
            errors: [{ message: 'User name must be at least 3 character long!' }],
          })
        })
      })
    })

    describe('with slug', () => {
      describe('is allowed', () => {
        it('has success', async () => {
          variables = {
            ...variables,
            slug: 'superman',
          }
          await expect(
            mutate({ mutation: signupVerificationMutation, variables }),
          ).resolves.toMatchObject({
            data: { SignupVerification: { slug: 'superman' } },
            errors: undefined,
          })
        })
      })

      describe('"all" in blacklist', () => {
        it('throws an error', async () => {
          variables = {
            ...variables,
            slug: 'all',
          }
          await expect(
            mutate({ mutation: signupVerificationMutation, variables }),
          ).resolves.toMatchObject({
            data: { SignupVerification: null },
            errors: [{ message: 'User slug “all” must not be in blacklist!' }],
          })
        })
      })
    })
  })

  describe('UpdateUser', () => {
    let userParams, variables, updatingUser

    beforeEach(async () => {
      userParams = {
        id: 'updating-user',
        name: 'John Doe',
      }

      variables = {
        id: 'updating-user',
        name: 'John Doughnut',
      }
      updatingUser = await Factory.build('user', userParams)
      authenticatedUser = await updatingUser.toJson()
    })

    describe('with name', () => {
      describe('is allowed', () => {
        it('has success', async () => {
          await expect(mutate({ mutation: updateUserMutation, variables })).resolves.toMatchObject({
            data: { UpdateUser: { name: 'John Doughnut' } },
            errors: undefined,
          })
        })

        it('throws an error', async () => {
          variables = {
            ...variables,
            name: '  ',
          }
          await expect(mutate({ mutation: updateUserMutation, variables })).resolves.toMatchObject({
            data: { UpdateUser: null },
            errors: [{ message: 'User name must be at least 3 character long!' }],
          })
        })
      })
    })

    describe('with slug', () => {
      describe('is allowed', () => {
        it('has success', async () => {
          variables = {
            ...variables,
            slug: 'superman',
          }
          await expect(mutate({ mutation: updateUserMutation, variables })).resolves.toMatchObject({
            data: { UpdateUser: { slug: 'superman' } },
            errors: undefined,
          })
        })
      })

      describe('"all" in blacklist', () => {
        it('throws an error', async () => {
          variables = {
            ...variables,
            slug: 'all',
          }
          await expect(mutate({ mutation: updateUserMutation, variables })).resolves.toMatchObject({
            data: { UpdateUser: null },
            errors: [{ message: 'User slug “all” must not be in blacklist!' }],
          })
        })
      })
    })
  })
})
