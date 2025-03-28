/* eslint-disable promise/prefer-await-to-callbacks */
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'
import jwt from 'jsonwebtoken'

import CONFIG from '@config/index'
import { categories } from '@constants/categories'
import Factory, { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import { loginMutation } from '@graphql/userManagement'
import encode from '@jwt/encode'
import createServer, { context } from '@src/server'

const neode = getNeode()
const driver = getDriver()

let query, mutate, variables, req, user

const disable = async (id) => {
  const moderator = await Factory.build('user', { id: 'u2', role: 'moderator' })
  const user = await neode.find('User', id)
  const reportAgainstUser = await Factory.build('report')
  await Promise.all([
    reportAgainstUser.relateTo(moderator, 'filed', {
      resourceId: id,
      reasonCategory: 'discrimination_etc',
      reasonDescription: 'This user is harassing me with bigoted remarks!',
    }),
    reportAgainstUser.relateTo(user, 'belongsTo'),
  ])
  const disableVariables = { resourceId: user.id, disable: true, closed: false }
  await Promise.all([
    reportAgainstUser.relateTo(moderator, 'reviewed', disableVariables),
    user.update({ disabled: true, updatedAt: new Date().toISOString() }),
  ])
}

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      // One of the rare occasions where we test
      // the actual `context` implementation here
      return context({ req })
    },
  })
  query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

beforeEach(() => {
  user = null
  req = { headers: {} }
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('currentUser', () => {
  const currentUserQuery = gql`
    {
      currentUser {
        id
        slug
        name
        avatar {
          url
        }
        email
        role
        activeCategories
      }
    }
  `

  const respondsWith = async (expected) => {
    await expect(query({ query: currentUserQuery, variables })).resolves.toMatchObject(expected)
  }

  describe('unauthenticated', () => {
    it('throws "Not Authorized!"', async () => {
      await respondsWith({ errors: [{ message: 'Not Authorized!' }] })
    })
  })

  describe('authenticated', () => {
    describe('and corresponding user in the database', () => {
      let avatar

      beforeEach(async () => {
        avatar = await Factory.build('image', {
          url: 'https://s3.amazonaws.com/uifaces/faces/twitter/jimmuirhead/128.jpg',
        })
        await Factory.build(
          'user',
          {
            id: 'u3',
            // the `id` is the only thing that has to match the decoded JWT bearer token
            name: 'Matilde Hermiston',
            slug: 'matilde-hermiston',
            role: 'user',
          },
          {
            email: 'test@example.org',
            avatar,
          },
        )
        const userBearerToken = encode({ id: 'u3' })
        req = { headers: { authorization: `Bearer ${userBearerToken}` } }
      })

      it('returns the whole user object', async () => {
        const expected = {
          data: {
            currentUser: {
              id: 'u3',
              avatar: {
                url: expect.stringContaining(
                  'https://s3.amazonaws.com/uifaces/faces/twitter/jimmuirhead/128.jpg',
                ),
              },
              email: 'test@example.org',
              name: 'Matilde Hermiston',
              slug: 'matilde-hermiston',
              role: 'user',
            },
          },
        }
        await respondsWith(expected)
      })

      describe('with categories in DB', () => {
        beforeEach(async () => {
          await Promise.all(
            categories.map(async ({ icon, name }, index) => {
              await Factory.build('category', {
                id: `cat${index + 1}`,
                slug: name,
                name,
                icon,
              })
            }),
          )
        })

        it('returns all categories by default', async () => {
          await respondsWith({
            data: {
              currentUser: expect.objectContaining({
                activeCategories: [
                  'cat1',
                  'cat10',
                  'cat11',
                  'cat12',
                  'cat13',
                  'cat14',
                  'cat15',
                  'cat16',
                  'cat17',
                  'cat18',
                  'cat19',
                  'cat2',
                  'cat3',
                  'cat4',
                  'cat5',
                  'cat6',
                  'cat7',
                  'cat8',
                  'cat9',
                ],
              }),
            },
          })
        })

        describe('with categories saved for current user', () => {
          const saveCategorySettings = gql`
            mutation ($activeCategories: [String]) {
              saveCategorySettings(activeCategories: $activeCategories)
            }
          `
          beforeEach(async () => {
            await mutate({
              mutation: saveCategorySettings,
              variables: { activeCategories: ['cat1', 'cat3', 'cat5', 'cat7'] },
            })
          })

          it('returns only the saved active categories', async () => {
            const result = await query({ query: currentUserQuery, variables })
            expect(result.data.currentUser.activeCategories).toHaveLength(4)
            expect(result.data.currentUser.activeCategories).toContain('cat1')
            expect(result.data.currentUser.activeCategories).toContain('cat3')
            expect(result.data.currentUser.activeCategories).toContain('cat5')
            expect(result.data.currentUser.activeCategories).toContain('cat7')
          })
        })
      })
    })
  })
})

describe('login', () => {
  const respondsWith = async (expected) => {
    await expect(mutate({ mutation: loginMutation, variables })).resolves.toMatchObject(expected)
  }

  beforeEach(async () => {
    variables = { email: 'test@example.org', password: '1234' }
    user = await Factory.build(
      'user',
      {
        id: 'acb2d923-f3af-479e-9f00-61b12e864666',
      },
      variables,
    )
  })

  describe('ask for a `token`', () => {
    describe('with a valid email/password combination', () => {
      it('responds with a JWT bearer token', async () => {
        const {
          data: { login: token },
        } = await mutate({ mutation: loginMutation, variables })
        jwt.verify(token, CONFIG.JWT_SECRET, (err, data) => {
          expect(data).toMatchObject({
            id: 'acb2d923-f3af-479e-9f00-61b12e864666',
          })
          expect(err).toBeNull()
        })
      })

      describe('but user account is deleted', () => {
        beforeEach(async () => {
          await user.update({ updatedAt: new Date().toISOString(), deleted: true })
        })

        it('responds with "Incorrect email address or password."', async () => {
          await respondsWith({
            data: null,
            errors: [{ message: 'Incorrect email address or password.' }],
          })
        })
      })

      describe('but user account is disabled', () => {
        beforeEach(async () => {
          await disable('acb2d923-f3af-479e-9f00-61b12e864666')
        })

        it('responds with "Your account has been disabled."', async () => {
          await respondsWith({
            data: null,
            errors: [{ message: 'Your account has been disabled.' }],
          })
        })
      })

      describe('normalization', () => {
        describe('email address is a gmail address ', () => {
          beforeEach(async () => {
            const email = await neode.first('EmailAddress', { email: 'test@example.org' })
            await email.update({ email: 'someuser@gmail.com' })
          })

          describe('supplied email contains dots', () => {
            beforeEach(() => {
              variables = { ...variables, email: 'some.user@gmail.com' }
            })

            it('normalizes email, issue #2329', async () => {
              await respondsWith({
                data: { login: expect.any(String) },
                errors: undefined,
              })
            })
          })
        })
      })
    })

    describe('with a valid email but incorrect password', () => {
      beforeEach(() => {
        variables = { ...variables, email: 'test@example.org', password: 'wrong' }
      })

      it('responds with "Incorrect email address or password."', async () => {
        await respondsWith({
          errors: [{ message: 'Incorrect email address or password.' }],
        })
      })
    })

    describe('with a non-existing email', () => {
      beforeEach(() => {
        variables = {
          ...variables,
          email: 'non-existent@example.org',
          password: '1234',
        }
      })

      it('responds with "Incorrect email address or password."', async () => {
        await respondsWith({
          errors: [{ message: 'Incorrect email address or password.' }],
        })
      })
    })
  })
})

describe('change password', () => {
  const changePasswordMutation = gql`
    mutation ($oldPassword: String!, $newPassword: String!) {
      changePassword(oldPassword: $oldPassword, newPassword: $newPassword)
    }
  `

  const respondsWith = async (expected) => {
    await expect(mutate({ mutation: changePasswordMutation, variables })).resolves.toMatchObject(
      expected,
    )
  }

  beforeEach(async () => {
    variables = { ...variables, oldPassword: 'what', newPassword: 'ever' }
  })

  describe('unauthenticated', () => {
    it('throws "Not Authorized!"', async () => {
      await respondsWith({ errors: [{ message: 'Not Authorized!' }] })
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      await Factory.build('user', { id: 'u3' })
      const userBearerToken = encode({ id: 'u3' })
      req = { headers: { authorization: `Bearer ${userBearerToken}` } }
    })
    describe('old password === new password', () => {
      beforeEach(() => {
        variables = { ...variables, oldPassword: '1234', newPassword: '1234' }
      })

      it('responds with "Old password and new password should be different"', async () => {
        await respondsWith({
          errors: [{ message: 'Old password and new password should be different' }],
        })
      })
    })

    describe('incorrect old password', () => {
      beforeEach(() => {
        variables = {
          ...variables,
          oldPassword: 'notOldPassword',
          newPassword: '12345',
        }
      })

      it('responds with "Old password isn\'t valid"', async () => {
        await respondsWith({ errors: [{ message: 'Old password is not correct' }] })
      })
    })

    describe('correct password', () => {
      beforeEach(() => {
        variables = {
          ...variables,
          oldPassword: '1234',
          newPassword: '12345',
        }
      })

      it('changes the password if given correct credentials "', async () => {
        await respondsWith({ data: { changePassword: expect.any(String) } })
      })
    })
  })
})
