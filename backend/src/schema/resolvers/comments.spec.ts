import Factory, { cleanDatabase } from '../../db/factories'
import gql from 'graphql-tag'
import { createTestClient } from 'apollo-server-testing'
import createServer from '../../server'
import { getNeode, getDriver } from '../../db/neo4j'

const driver = getDriver()
const neode = getNeode()

let variables, mutate, authenticatedUser, commentAuthor, newlyCreatedComment

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        driver,
        user: authenticatedUser,
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
  variables = {}
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

const createCommentMutation = gql`
  mutation ($id: ID, $postId: ID!, $content: String!) {
    CreateComment(id: $id, postId: $postId, content: $content) {
      id
      content
      author {
        name
      }
    }
  }
`
const setupPostAndComment = async () => {
  commentAuthor = await Factory.build('user')
  await Factory.build(
    'post',
    {
      id: 'p1',
      content: 'Post to be commented',
    },
    {
      categoryIds: ['cat9'],
    },
  )
  newlyCreatedComment = await Factory.build(
    'comment',
    {
      id: 'c456',
      content: 'Comment to be deleted',
    },
    {
      postId: 'p1',
      author: commentAuthor,
    },
  )
  variables = {
    ...variables,
    id: 'c456',
    content: 'The comment is updated',
  }
}

describe('CreateComment', () => {
  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      variables = {
        ...variables,
        postId: 'p1',
        content: "I'm not authorized to comment",
      }
      const { errors } = await mutate({ mutation: createCommentMutation, variables })
      expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      const user = await neode.create('User', { name: 'Author' })
      authenticatedUser = await user.toJson()
    })

    describe('given a post', () => {
      beforeEach(async () => {
        await Factory.build('post', { id: 'p1' }, { categoryIds: ['cat9'] })
        variables = {
          ...variables,
          postId: 'p1',
          content: "I'm authorized to comment",
        }
      })

      it('creates a comment', async () => {
        await expect(mutate({ mutation: createCommentMutation, variables })).resolves.toMatchObject(
          {
            data: { CreateComment: { content: "I'm authorized to comment" } },
            errors: undefined,
          },
        )
      })

      it('assigns the authenticated user as author', async () => {
        await expect(mutate({ mutation: createCommentMutation, variables })).resolves.toMatchObject(
          {
            data: { CreateComment: { author: { name: 'Author' } } },
            errors: undefined,
          },
        )
      })
    })
  })
})

describe('UpdateComment', () => {
  const updateCommentMutation = gql`
    mutation ($content: String!, $id: ID!) {
      UpdateComment(content: $content, id: $id) {
        id
        content
        createdAt
        updatedAt
      }
    }
  `

  describe('given a post and a comment', () => {
    beforeEach(setupPostAndComment)

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const { errors } = await mutate({ mutation: updateCommentMutation, variables })
        expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated but not the author', () => {
      beforeEach(async () => {
        const randomGuy = await Factory.build('user')
        authenticatedUser = await randomGuy.toJson()
      })

      it('throws authorization error', async () => {
        const { errors } = await mutate({ mutation: updateCommentMutation, variables })
        expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated as author', () => {
      beforeEach(async () => {
        authenticatedUser = await commentAuthor.toJson()
      })

      it('updates the comment', async () => {
        const expected = {
          data: { UpdateComment: { id: 'c456', content: 'The comment is updated' } },
          errors: undefined,
        }
        await expect(mutate({ mutation: updateCommentMutation, variables })).resolves.toMatchObject(
          expected,
        )
      })

      it('updates a comment, but maintains non-updated attributes', async () => {
        const expected = {
          data: {
            UpdateComment: {
              id: 'c456',
              content: 'The comment is updated',
              createdAt: expect.any(String),
            },
          },
          errors: undefined,
        }
        await expect(mutate({ mutation: updateCommentMutation, variables })).resolves.toMatchObject(
          expected,
        )
      })

      it('updates the updatedAt attribute', async () => {
        newlyCreatedComment = await newlyCreatedComment.toJson()
        const {
          data: { UpdateComment },
        } = await mutate({ mutation: updateCommentMutation, variables })
        expect(newlyCreatedComment.updatedAt).toBeTruthy()
        expect(Date.parse(newlyCreatedComment.updatedAt)).toEqual(expect.any(Number))
        expect(UpdateComment.updatedAt).toBeTruthy()
        expect(Date.parse(UpdateComment.updatedAt)).toEqual(expect.any(Number))
        expect(newlyCreatedComment.updatedAt).not.toEqual(UpdateComment.updatedAt)
      })

      describe('if comment does not exist for given id', () => {
        beforeEach(() => {
          variables = { ...variables, id: 'does-not-exist' }
        })

        it('returns null', async () => {
          const { data, errors } = await mutate({ mutation: updateCommentMutation, variables })
          expect(data).toMatchObject({ UpdateComment: null })
          expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
        })
      })
    })
  })
})

describe('DeleteComment', () => {
  const deleteCommentMutation = gql`
    mutation ($id: ID!) {
      DeleteComment(id: $id) {
        id
        content
        contentExcerpt
        deleted
      }
    }
  `

  describe('given a post and a comment', () => {
    beforeEach(setupPostAndComment)

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const result = await mutate({ mutation: deleteCommentMutation, variables })
        expect(result.errors[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated but not the author', () => {
      beforeEach(async () => {
        const randomGuy = await Factory.build('user')
        authenticatedUser = await randomGuy.toJson()
      })

      it('throws authorization error', async () => {
        const { errors } = await mutate({ mutation: deleteCommentMutation, variables })
        expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated as author', () => {
      beforeEach(async () => {
        authenticatedUser = await commentAuthor.toJson()
      })

      it('marks the comment as deleted and blacks out content', async () => {
        const { data } = await mutate({ mutation: deleteCommentMutation, variables })
        const expected = {
          DeleteComment: {
            id: 'c456',
            deleted: true,
            content: 'UNAVAILABLE',
            contentExcerpt: 'UNAVAILABLE',
          },
        }
        expect(data).toMatchObject(expected)
      })
    })
  })
})
