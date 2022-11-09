import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import {
  createGroupMutation,
  updateGroupMutation,
  joinGroupMutation,
  leaveGroupMutation,
  changeGroupMemberRoleMutation,
  groupMembersQuery,
  groupQuery,
} from '../../graphql/groups'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'
import CONFIG from '../../config'

const driver = getDriver()
const neode = getNeode()

let authenticatedUser
let user
let noMemberUser
let pendingMemberUser
let usualMemberUser
let adminMemberUser
let ownerMemberUser
let secondOwnerMemberUser

const categoryIds = ['cat9', 'cat4', 'cat15']
const descriptionAdditional100 =
  ' 123456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789'
let variables = {}

const { server } = createServer({
  context: () => {
    return {
      driver,
      neode,
      user: authenticatedUser,
    }
  },
})
const { mutate, query } = createTestClient(server)

const seedBasicsAndClearAuthentication = async () => {
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
      id: 'cat4',
      name: 'Environment & Nature',
      slug: 'environment-nature',
      icon: 'tree',
    }),
    neode.create('Category', {
      id: 'cat9',
      name: 'Democracy & Politics',
      slug: 'democracy-politics',
      icon: 'university',
    }),
    neode.create('Category', {
      id: 'cat15',
      name: 'Consumption & Sustainability',
      slug: 'consumption-sustainability',
      icon: 'shopping-cart',
    }),
    neode.create('Category', {
      id: 'cat27',
      name: 'Animal Protection',
      slug: 'animal-protection',
      icon: 'paw',
    }),
  ])
  authenticatedUser = null
}

const seedComplexScenarioAndClearAuthentication = async () => {
  await seedBasicsAndClearAuthentication()
  // create users
  noMemberUser = await Factory.build(
    'user',
    {
      id: 'none-member-user',
      name: 'None Member TestUser',
    },
    {
      email: 'none-member-user@example.org',
      password: '1234',
    },
  )
  pendingMemberUser = await Factory.build(
    'user',
    {
      id: 'pending-member-user',
      name: 'Pending Member TestUser',
    },
    {
      email: 'pending-member-user@example.org',
      password: '1234',
    },
  )
  usualMemberUser = await Factory.build(
    'user',
    {
      id: 'usual-member-user',
      name: 'Usual Member TestUser',
    },
    {
      email: 'usual-member-user@example.org',
      password: '1234',
    },
  )
  adminMemberUser = await Factory.build(
    'user',
    {
      id: 'admin-member-user',
      name: 'Admin Member TestUser',
    },
    {
      email: 'admin-member-user@example.org',
      password: '1234',
    },
  )
  ownerMemberUser = await Factory.build(
    'user',
    {
      id: 'owner-member-user',
      name: 'Owner Member TestUser',
    },
    {
      email: 'owner-member-user@example.org',
      password: '1234',
    },
  )
  secondOwnerMemberUser = await Factory.build(
    'user',
    {
      id: 'second-owner-member-user',
      name: 'Second Owner Member TestUser',
    },
    {
      email: 'second-owner-member-user@example.org',
      password: '1234',
    },
  )
  // create groups
  // public-group
  authenticatedUser = await usualMemberUser.toJson()
  await mutate({
    mutation: createGroupMutation(),
    variables: {
      id: 'public-group',
      name: 'The Best Group',
      about: 'We will change the world!',
      description: 'Some description' + descriptionAdditional100,
      groupType: 'public',
      actionRadius: 'regional',
      categoryIds,
    },
  })
  await mutate({
    mutation: joinGroupMutation(),
    variables: {
      groupId: 'public-group',
      userId: 'owner-of-closed-group',
    },
  })
  await mutate({
    mutation: joinGroupMutation(),
    variables: {
      groupId: 'public-group',
      userId: 'owner-of-hidden-group',
    },
  })
  // closed-group
  authenticatedUser = await ownerMemberUser.toJson()
  await mutate({
    mutation: createGroupMutation(),
    variables: {
      id: 'closed-group',
      name: 'Uninteresting Group',
      about: 'We will change nothing!',
      description: 'We love it like it is!?' + descriptionAdditional100,
      groupType: 'closed',
      actionRadius: 'national',
      categoryIds,
    },
  })
  // hidden-group
  authenticatedUser = await adminMemberUser.toJson()
  await mutate({
    mutation: createGroupMutation(),
    variables: {
      id: 'hidden-group',
      name: 'Investigative Journalism Group',
      about: 'We will change all.',
      description: 'We research …' + descriptionAdditional100,
      groupType: 'hidden',
      actionRadius: 'global',
      categoryIds,
    },
  })
  // 'JoinGroup' mutation does not work in hidden groups so we join them by 'ChangeGroupMemberRole' through the owner
  await mutate({
    mutation: changeGroupMemberRoleMutation(),
    variables: {
      groupId: 'hidden-group',
      userId: 'admin-member-user',
      roleInGroup: 'usual',
    },
  })
  await mutate({
    mutation: changeGroupMemberRoleMutation(),
    variables: {
      groupId: 'hidden-group',
      userId: 'second-owner-member-user',
      roleInGroup: 'usual',
    },
  })
  await mutate({
    mutation: changeGroupMemberRoleMutation(),
    variables: {
      groupId: 'hidden-group',
      userId: 'admin-member-user',
      roleInGroup: 'usual',
    },
  })
  await mutate({
    mutation: changeGroupMemberRoleMutation(),
    variables: {
      groupId: 'hidden-group',
      userId: 'second-owner-member-user',
      roleInGroup: 'usual',
    },
  })

  authenticatedUser = null
}

beforeAll(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
})

describe('in mode', () => {
  describe('clean db after each single test', () => {
    beforeEach(async () => {
      await seedBasicsAndClearAuthentication()
    })

    // TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
    afterEach(async () => {
      await cleanDatabase()
    })

    describe('CreateGroup', () => {
      beforeEach(() => {
        variables = {
          ...variables,
          id: 'g589',
          name: 'The Best Group',
          slug: 'the-group',
          about: 'We will change the world!',
          description: 'Some description' + descriptionAdditional100,
          groupType: 'public',
          actionRadius: 'regional',
          categoryIds,
          locationName: 'Hamburg, Germany',
        }
      })

      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          const { errors } = await mutate({ mutation: createGroupMutation(), variables })
          expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
        })
      })

      describe('authenticated', () => {
        beforeEach(async () => {
          authenticatedUser = await user.toJson()
        })

        it('creates a group', async () => {
          await expect(
            mutate({ mutation: createGroupMutation(), variables }),
          ).resolves.toMatchObject({
            data: {
              CreateGroup: {
                name: 'The Best Group',
                slug: 'the-group',
                about: 'We will change the world!',
                description: 'Some description' + descriptionAdditional100,
                descriptionExcerpt: 'Some description' + descriptionAdditional100,
                groupType: 'public',
                actionRadius: 'regional',
                locationName: 'Hamburg, Germany',
                location: expect.objectContaining({
                  name: 'Hamburg',
                  nameDE: 'Hamburg',
                  nameEN: 'Hamburg',
                }),
              },
            },
            errors: undefined,
          })
        })

        it('assigns the authenticated user as owner', async () => {
          await expect(
            mutate({ mutation: createGroupMutation(), variables }),
          ).resolves.toMatchObject({
            data: {
              CreateGroup: {
                name: 'The Best Group',
                myRole: 'owner',
              },
            },
            errors: undefined,
          })
        })

        it('has "disabled" and "deleted" default to "false"', async () => {
          await expect(
            mutate({ mutation: createGroupMutation(), variables }),
          ).resolves.toMatchObject({
            data: { CreateGroup: { disabled: false, deleted: false } },
          })
        })

        describe('description', () => {
          describe('length without HTML', () => {
            describe('less then 100 chars', () => {
              it('throws error: "Description too short!"', async () => {
                const { errors } = await mutate({
                  mutation: createGroupMutation(),
                  variables: {
                    ...variables,
                    description:
                      '0123456789' +
                      '<a href="https://domain.org/0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789">0123456789</a>',
                  },
                })
                expect(errors[0]).toHaveProperty('message', 'Description too short!')
              })
            })
          })
        })

        describe('categories', () => {
          beforeEach(() => {
            CONFIG.CATEGORIES_ACTIVE = true
          })

          describe('with matching amount of categories', () => {
            it('has new categories', async () => {
              await expect(
                mutate({
                  mutation: createGroupMutation(),
                  variables: {
                    ...variables,
                    categoryIds: ['cat4', 'cat27'],
                  },
                }),
              ).resolves.toMatchObject({
                data: {
                  CreateGroup: {
                    categories: expect.arrayContaining([
                      expect.objectContaining({ id: 'cat4' }),
                      expect.objectContaining({ id: 'cat27' }),
                    ]),
                    myRole: 'owner',
                  },
                },
                errors: undefined,
              })
            })
          })

          describe('not even one', () => {
            describe('by "categoryIds: null"', () => {
              it('throws error: "Too view categories!"', async () => {
                const { errors } = await mutate({
                  mutation: createGroupMutation(),
                  variables: { ...variables, categoryIds: null },
                })
                expect(errors[0]).toHaveProperty('message', 'Too view categories!')
              })
            })

            describe('by "categoryIds: []"', () => {
              it('throws error: "Too view categories!"', async () => {
                const { errors } = await mutate({
                  mutation: createGroupMutation(),
                  variables: { ...variables, categoryIds: [] },
                })
                expect(errors[0]).toHaveProperty('message', 'Too view categories!')
              })
            })
          })

          describe('four', () => {
            it('throws error: "Too many categories!"', async () => {
              const { errors } = await mutate({
                mutation: createGroupMutation(),
                variables: { ...variables, categoryIds: ['cat9', 'cat4', 'cat15', 'cat27'] },
              })
              expect(errors[0]).toHaveProperty('message', 'Too many categories!')
            })
          })
        })
      })
    })
  })

  describe('building up – clean db after each resolver', () => {
    describe('Group', () => {
      beforeAll(async () => {
        await seedBasicsAndClearAuthentication()
      })

      afterAll(async () => {
        await cleanDatabase()
      })

      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          const { errors } = await query({ query: groupQuery(), variables: {} })
          expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
        })
      })

      describe('authenticated', () => {
        let otherUser
        let ownerOfHiddenGroupUser

        beforeAll(async () => {
          otherUser = await Factory.build(
            'user',
            {
              id: 'other-user',
              name: 'Other TestUser',
            },
            {
              email: 'other-user@example.org',
              password: '1234',
            },
          )
          ownerOfHiddenGroupUser = await Factory.build(
            'user',
            {
              id: 'owner-of-hidden-group',
              name: 'Owner Of Hidden Group',
            },
            {
              email: 'owner-of-hidden-group@example.org',
              password: '1234',
            },
          )
          authenticatedUser = await otherUser.toJson()
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'others-group',
              name: 'Uninteresting Group',
              about: 'We will change nothing!',
              description: 'We love it like it is!?' + descriptionAdditional100,
              groupType: 'closed',
              actionRadius: 'global',
              categoryIds,
            },
          })
          authenticatedUser = await ownerOfHiddenGroupUser.toJson()
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'hidden-group',
              name: 'Investigative Journalism Group',
              about: 'We will change all.',
              description: 'We research …' + descriptionAdditional100,
              groupType: 'hidden',
              actionRadius: 'global',
              categoryIds,
            },
          })
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'second-hidden-group',
              name: 'Second Investigative Journalism Group',
              about: 'We will change all.',
              description: 'We research …' + descriptionAdditional100,
              groupType: 'hidden',
              actionRadius: 'global',
              categoryIds,
            },
          })
          await mutate({
            mutation: changeGroupMemberRoleMutation(),
            variables: {
              groupId: 'second-hidden-group',
              userId: 'current-user',
              roleInGroup: 'pending',
            },
          })
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'third-hidden-group',
              name: 'Third Investigative Journalism Group',
              about: 'We will change all.',
              description: 'We research …' + descriptionAdditional100,
              groupType: 'hidden',
              actionRadius: 'global',
              categoryIds,
            },
          })
          await mutate({
            mutation: changeGroupMemberRoleMutation(),
            variables: {
              groupId: 'third-hidden-group',
              userId: 'current-user',
              roleInGroup: 'usual',
            },
          })
          authenticatedUser = await user.toJson()
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'my-group',
              name: 'The Best Group',
              about: 'We will change the world!',
              description: 'Some description' + descriptionAdditional100,
              groupType: 'public',
              actionRadius: 'regional',
              categoryIds,
              locationName: 'Hamburg, Germany',
            },
          })
        })

        describe('query groups', () => {
          describe('in general finds only listed groups – no hidden groups where user is none or pending member', () => {
            describe('without any filters', () => {
              it('finds all listed groups – including the set descriptionExcerpts and locations', async () => {
                const result = await query({ query: groupQuery(), variables: {} })
                expect(result).toMatchObject({
                  data: {
                    Group: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'my-group',
                        slug: 'the-best-group',
                        descriptionExcerpt: 'Some description' + descriptionAdditional100,
                        locationName: 'Hamburg, Germany',
                        location: expect.objectContaining({
                          name: 'Hamburg',
                          nameDE: 'Hamburg',
                          nameEN: 'Hamburg',
                        }),
                        myRole: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'others-group',
                        slug: 'uninteresting-group',
                        descriptionExcerpt: 'We love it like it is!?' + descriptionAdditional100,
                        locationName: null,
                        location: null,
                        myRole: null,
                      }),
                      expect.objectContaining({
                        id: 'third-hidden-group',
                        slug: 'third-investigative-journalism-group',
                        descriptionExcerpt: 'We research …' + descriptionAdditional100,
                        myRole: 'usual',
                        locationName: null,
                        location: null,
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.Group.length).toBe(3)
              })

              describe('categories', () => {
                beforeEach(() => {
                  CONFIG.CATEGORIES_ACTIVE = true
                })

                it('has set categories', async () => {
                  await expect(
                    query({ query: groupQuery(), variables: {} }),
                  ).resolves.toMatchObject({
                    data: {
                      Group: expect.arrayContaining([
                        expect.objectContaining({
                          id: 'my-group',
                          slug: 'the-best-group',
                          categories: expect.arrayContaining([
                            expect.objectContaining({ id: 'cat4' }),
                            expect.objectContaining({ id: 'cat9' }),
                            expect.objectContaining({ id: 'cat15' }),
                          ]),
                          myRole: 'owner',
                        }),
                        expect.objectContaining({
                          id: 'others-group',
                          slug: 'uninteresting-group',
                          categories: expect.arrayContaining([
                            expect.objectContaining({ id: 'cat4' }),
                            expect.objectContaining({ id: 'cat9' }),
                            expect.objectContaining({ id: 'cat15' }),
                          ]),
                          myRole: null,
                        }),
                      ]),
                    },
                    errors: undefined,
                  })
                })
              })
            })

            describe('with given id', () => {
              describe("id = 'my-group'", () => {
                it('finds only the listed group with this id', async () => {
                  const result = await query({ query: groupQuery(), variables: { id: 'my-group' } })
                  expect(result).toMatchObject({
                    data: {
                      Group: [
                        expect.objectContaining({
                          id: 'my-group',
                          slug: 'the-best-group',
                          myRole: 'owner',
                        }),
                      ],
                    },
                    errors: undefined,
                  })
                  expect(result.data.Group.length).toBe(1)
                })
              })

              describe("id = 'third-hidden-group'", () => {
                it("finds only the hidden group where I'm 'usual' member", async () => {
                  const result = await query({
                    query: groupQuery(),
                    variables: { id: 'third-hidden-group' },
                  })
                  expect(result).toMatchObject({
                    data: {
                      Group: expect.arrayContaining([
                        expect.objectContaining({
                          id: 'third-hidden-group',
                          slug: 'third-investigative-journalism-group',
                          myRole: 'usual',
                        }),
                      ]),
                    },
                    errors: undefined,
                  })
                  expect(result.data.Group.length).toBe(1)
                })
              })

              describe("id = 'second-hidden-group'", () => {
                it("finds no hidden group where I'm 'pending' member", async () => {
                  const result = await query({
                    query: groupQuery(),
                    variables: { id: 'second-hidden-group' },
                  })
                  expect(result.data.Group.length).toBe(0)
                })
              })

              describe("id = 'hidden-group'", () => {
                it("finds no hidden group where I'm not(!) a member at all", async () => {
                  const result = await query({
                    query: groupQuery(),
                    variables: { id: 'hidden-group' },
                  })
                  expect(result.data.Group.length).toBe(0)
                })
              })
            })

            describe('with given slug', () => {
              describe("slug = 'the-best-group'", () => {
                it('finds only the listed group with this slug', async () => {
                  const result = await query({
                    query: groupQuery(),
                    variables: { slug: 'the-best-group' },
                  })
                  expect(result).toMatchObject({
                    data: {
                      Group: [
                        expect.objectContaining({
                          id: 'my-group',
                          slug: 'the-best-group',
                          myRole: 'owner',
                        }),
                      ],
                    },
                    errors: undefined,
                  })
                  expect(result.data.Group.length).toBe(1)
                })
              })

              describe("slug = 'third-investigative-journalism-group'", () => {
                it("finds only the hidden group where I'm 'usual' member", async () => {
                  const result = await query({
                    query: groupQuery(),
                    variables: { slug: 'third-investigative-journalism-group' },
                  })
                  expect(result).toMatchObject({
                    data: {
                      Group: expect.arrayContaining([
                        expect.objectContaining({
                          id: 'third-hidden-group',
                          slug: 'third-investigative-journalism-group',
                          myRole: 'usual',
                        }),
                      ]),
                    },
                    errors: undefined,
                  })
                  expect(result.data.Group.length).toBe(1)
                })
              })

              describe("slug = 'second-investigative-journalism-group'", () => {
                it("finds no hidden group where I'm 'pending' member", async () => {
                  const result = await query({
                    query: groupQuery(),
                    variables: { slug: 'second-investigative-journalism-group' },
                  })
                  expect(result.data.Group.length).toBe(0)
                })
              })

              describe("slug = 'investigative-journalism-group'", () => {
                it("finds no hidden group where I'm not(!) a member at all", async () => {
                  const result = await query({
                    query: groupQuery(),
                    variables: { slug: 'investigative-journalism-group' },
                  })
                  expect(result.data.Group.length).toBe(0)
                })
              })
            })

            describe('isMember = true', () => {
              it('finds only listed groups where user is member', async () => {
                const result = await query({ query: groupQuery(), variables: { isMember: true } })
                expect(result).toMatchObject({
                  data: {
                    Group: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'my-group',
                        slug: 'the-best-group',
                        myRole: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'third-hidden-group',
                        slug: 'third-investigative-journalism-group',
                        myRole: 'usual',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.Group.length).toBe(2)
              })
            })

            describe('isMember = false', () => {
              it('finds only listed groups where user is not(!) member', async () => {
                const result = await query({ query: groupQuery(), variables: { isMember: false } })
                expect(result).toMatchObject({
                  data: {
                    Group: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'others-group',
                        slug: 'uninteresting-group',
                        myRole: null,
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.Group.length).toBe(1)
              })
            })
          })
        })
      })
    })

    describe('JoinGroup', () => {
      beforeAll(async () => {
        await seedBasicsAndClearAuthentication()
      })

      afterAll(async () => {
        await cleanDatabase()
      })

      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          const { errors } = await mutate({
            mutation: joinGroupMutation(),
            variables: {
              groupId: 'not-existing-group',
              userId: 'current-user',
            },
          })
          expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
        })
      })

      describe('authenticated', () => {
        let ownerOfClosedGroupUser
        let ownerOfHiddenGroupUser

        beforeAll(async () => {
          // create users
          ownerOfClosedGroupUser = await Factory.build(
            'user',
            {
              id: 'owner-of-closed-group',
              name: 'Owner Of Closed Group',
            },
            {
              email: 'owner-of-closed-group@example.org',
              password: '1234',
            },
          )
          ownerOfHiddenGroupUser = await Factory.build(
            'user',
            {
              id: 'owner-of-hidden-group',
              name: 'Owner Of Hidden Group',
            },
            {
              email: 'owner-of-hidden-group@example.org',
              password: '1234',
            },
          )
          // create groups
          // public-group
          authenticatedUser = await ownerOfClosedGroupUser.toJson()
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'closed-group',
              name: 'Uninteresting Group',
              about: 'We will change nothing!',
              description: 'We love it like it is!?' + descriptionAdditional100,
              groupType: 'closed',
              actionRadius: 'national',
              categoryIds,
            },
          })
          authenticatedUser = await ownerOfHiddenGroupUser.toJson()
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'hidden-group',
              name: 'Investigative Journalism Group',
              about: 'We will change all.',
              description: 'We research …' + descriptionAdditional100,
              groupType: 'hidden',
              actionRadius: 'global',
              categoryIds,
            },
          })
          authenticatedUser = await user.toJson()
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'public-group',
              name: 'The Best Group',
              about: 'We will change the world!',
              description: 'Some description' + descriptionAdditional100,
              groupType: 'public',
              actionRadius: 'regional',
              categoryIds,
            },
          })
        })

        describe('public group', () => {
          describe('joined by "owner-of-closed-group"', () => {
            it('has "usual" as membership role', async () => {
              await expect(
                mutate({
                  mutation: joinGroupMutation(),
                  variables: {
                    groupId: 'public-group',
                    userId: 'owner-of-closed-group',
                  },
                }),
              ).resolves.toMatchObject({
                data: {
                  JoinGroup: {
                    id: 'owner-of-closed-group',
                    myRoleInGroup: 'usual',
                  },
                },
                errors: undefined,
              })
            })
          })

          describe('joined by its owner', () => {
            describe('does not create additional "MEMBER_OF" relation and therefore', () => {
              it('has still "owner" as membership role', async () => {
                await expect(
                  mutate({
                    mutation: joinGroupMutation(),
                    variables: {
                      groupId: 'public-group',
                      userId: 'current-user',
                    },
                  }),
                ).resolves.toMatchObject({
                  data: {
                    JoinGroup: {
                      id: 'current-user',
                      myRoleInGroup: 'owner',
                    },
                  },
                  errors: undefined,
                })
              })
            })
          })
        })

        describe('closed group', () => {
          describe('joined by "current-user"', () => {
            it('has "pending" as membership role', async () => {
              await expect(
                mutate({
                  mutation: joinGroupMutation(),
                  variables: {
                    groupId: 'closed-group',
                    userId: 'current-user',
                  },
                }),
              ).resolves.toMatchObject({
                data: {
                  JoinGroup: {
                    id: 'current-user',
                    myRoleInGroup: 'pending',
                  },
                },
                errors: undefined,
              })
            })
          })

          describe('joined by its owner', () => {
            describe('does not create additional "MEMBER_OF" relation and therefore', () => {
              it('has still "owner" as membership role', async () => {
                await expect(
                  mutate({
                    mutation: joinGroupMutation(),
                    variables: {
                      groupId: 'closed-group',
                      userId: 'owner-of-closed-group',
                    },
                  }),
                ).resolves.toMatchObject({
                  data: {
                    JoinGroup: {
                      id: 'owner-of-closed-group',
                      myRoleInGroup: 'owner',
                    },
                  },
                  errors: undefined,
                })
              })
            })
          })
        })

        describe('hidden group', () => {
          describe('joined by "owner-of-closed-group"', () => {
            it('throws authorization error', async () => {
              const { errors } = await query({
                query: joinGroupMutation(),
                variables: {
                  groupId: 'hidden-group',
                  userId: 'owner-of-closed-group',
                },
              })
              expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
            })
          })

          describe('joined by its owner', () => {
            describe('does not create additional "MEMBER_OF" relation and therefore', () => {
              it('has still "owner" as membership role', async () => {
                await expect(
                  mutate({
                    mutation: joinGroupMutation(),
                    variables: {
                      groupId: 'hidden-group',
                      userId: 'owner-of-hidden-group',
                    },
                  }),
                ).resolves.toMatchObject({
                  data: {
                    JoinGroup: {
                      id: 'owner-of-hidden-group',
                      myRoleInGroup: 'owner',
                    },
                  },
                  errors: undefined,
                })
              })
            })
          })
        })
      })
    })

    describe('GroupMembers', () => {
      beforeAll(async () => {
        await seedBasicsAndClearAuthentication()
      })

      afterAll(async () => {
        await cleanDatabase()
      })

      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          variables = {
            id: 'not-existing-group',
          }
          const { errors } = await query({ query: groupMembersQuery(), variables })
          expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
        })
      })

      describe('authenticated', () => {
        let otherUser
        let pendingUser
        let ownerOfClosedGroupUser
        let ownerOfHiddenGroupUser

        beforeAll(async () => {
          // create users
          otherUser = await Factory.build(
            'user',
            {
              id: 'other-user',
              name: 'Other TestUser',
            },
            {
              email: 'other-user@example.org',
              password: '1234',
            },
          )
          pendingUser = await Factory.build(
            'user',
            {
              id: 'pending-user',
              name: 'Pending TestUser',
            },
            {
              email: 'pending@example.org',
              password: '1234',
            },
          )
          ownerOfClosedGroupUser = await Factory.build(
            'user',
            {
              id: 'owner-of-closed-group',
              name: 'Owner Of Closed Group',
            },
            {
              email: 'owner-of-closed-group@example.org',
              password: '1234',
            },
          )
          ownerOfHiddenGroupUser = await Factory.build(
            'user',
            {
              id: 'owner-of-hidden-group',
              name: 'Owner Of Hidden Group',
            },
            {
              email: 'owner-of-hidden-group@example.org',
              password: '1234',
            },
          )
          // create groups
          // public-group
          authenticatedUser = await user.toJson()
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'public-group',
              name: 'The Best Group',
              about: 'We will change the world!',
              description: 'Some description' + descriptionAdditional100,
              groupType: 'public',
              actionRadius: 'regional',
              categoryIds,
            },
          })
          await mutate({
            mutation: joinGroupMutation(),
            variables: {
              groupId: 'public-group',
              userId: 'owner-of-closed-group',
            },
          })
          await mutate({
            mutation: joinGroupMutation(),
            variables: {
              groupId: 'public-group',
              userId: 'owner-of-hidden-group',
            },
          })
          // closed-group
          authenticatedUser = await ownerOfClosedGroupUser.toJson()
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'closed-group',
              name: 'Uninteresting Group',
              about: 'We will change nothing!',
              description: 'We love it like it is!?' + descriptionAdditional100,
              groupType: 'closed',
              actionRadius: 'national',
              categoryIds,
            },
          })
          await mutate({
            mutation: joinGroupMutation(),
            variables: {
              groupId: 'closed-group',
              userId: 'current-user',
            },
          })
          await mutate({
            mutation: changeGroupMemberRoleMutation(),
            variables: {
              groupId: 'closed-group',
              userId: 'owner-of-hidden-group',
              roleInGroup: 'usual',
            },
          })
          // hidden-group
          authenticatedUser = await ownerOfHiddenGroupUser.toJson()
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'hidden-group',
              name: 'Investigative Journalism Group',
              about: 'We will change all.',
              description: 'We research …' + descriptionAdditional100,
              groupType: 'hidden',
              actionRadius: 'global',
              categoryIds,
            },
          })
          // 'JoinGroup' mutation does not work in hidden groups so we join them by 'ChangeGroupMemberRole' through the owner
          await mutate({
            mutation: changeGroupMemberRoleMutation(),
            variables: {
              groupId: 'hidden-group',
              userId: 'pending-user',
              roleInGroup: 'pending',
            },
          })
          await mutate({
            mutation: changeGroupMemberRoleMutation(),
            variables: {
              groupId: 'hidden-group',
              userId: 'current-user',
              roleInGroup: 'usual',
            },
          })
          await mutate({
            mutation: changeGroupMemberRoleMutation(),
            variables: {
              groupId: 'hidden-group',
              userId: 'owner-of-closed-group',
              roleInGroup: 'admin',
            },
          })

          authenticatedUser = null
        })

        describe('public group', () => {
          beforeEach(async () => {
            variables = {
              id: 'public-group',
            }
          })

          describe('query group members', () => {
            describe('by owner "current-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await user.toJson()
              })

              it('finds all members', async () => {
                const result = await query({
                  query: groupMembersQuery(),
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'usual',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(3)
              })
            })

            describe('by usual member "owner-of-closed-group"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerOfClosedGroupUser.toJson()
              })

              it('finds all members', async () => {
                const result = await query({
                  query: groupMembersQuery(),
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'usual',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(3)
              })
            })

            describe('by none member "other-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await otherUser.toJson()
              })

              it('finds all members', async () => {
                const result = await query({
                  query: groupMembersQuery(),
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'usual',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(3)
              })
            })
          })
        })

        describe('closed group', () => {
          beforeEach(async () => {
            variables = {
              id: 'closed-group',
            }
          })

          describe('query group members', () => {
            describe('by owner "owner-of-closed-group"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerOfClosedGroupUser.toJson()
              })

              it('finds all members', async () => {
                const result = await query({
                  query: groupMembersQuery(),
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'pending',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'usual',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(3)
              })
            })

            describe('by usual member "owner-of-hidden-group"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerOfHiddenGroupUser.toJson()
              })

              it('finds all members', async () => {
                const result = await query({
                  query: groupMembersQuery(),
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'pending',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'usual',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(3)
              })
            })

            describe('by pending member "current-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await user.toJson()
              })

              it('throws authorization error', async () => {
                const { errors } = await query({ query: groupMembersQuery(), variables })
                expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
              })
            })

            describe('by none member "other-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await otherUser.toJson()
              })

              it('throws authorization error', async () => {
                const { errors } = await query({ query: groupMembersQuery(), variables })
                expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
              })
            })
          })
        })

        describe('hidden group', () => {
          beforeEach(async () => {
            variables = {
              id: 'hidden-group',
            }
          })

          describe('query group members', () => {
            describe('by owner "owner-of-hidden-group"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerOfHiddenGroupUser.toJson()
              })

              it('finds all members', async () => {
                const result = await query({
                  query: groupMembersQuery(),
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'pending-user',
                        myRoleInGroup: 'pending',
                      }),
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'admin',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'owner',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(4)
              })
            })

            describe('by usual member "current-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await user.toJson()
              })

              it('finds all members', async () => {
                const result = await query({
                  query: groupMembersQuery(),
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'pending-user',
                        myRoleInGroup: 'pending',
                      }),
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'admin',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'owner',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(4)
              })
            })

            describe('by admin member "owner-of-closed-group"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerOfClosedGroupUser.toJson()
              })

              it('finds all members', async () => {
                const result = await query({
                  query: groupMembersQuery(),
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'pending-user',
                        myRoleInGroup: 'pending',
                      }),
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'admin',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'owner',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(4)
              })
            })

            describe('by pending member "pending-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await pendingUser.toJson()
              })

              it('throws authorization error', async () => {
                const { errors } = await query({ query: groupMembersQuery(), variables })
                expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
              })
            })

            describe('by none member "other-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await otherUser.toJson()
              })

              it('throws authorization error', async () => {
                const { errors } = await query({ query: groupMembersQuery(), variables })
                expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
              })
            })
          })
        })
      })
    })

    describe('ChangeGroupMemberRole', () => {
      beforeAll(async () => {
        await seedComplexScenarioAndClearAuthentication()
      })

      afterAll(async () => {
        await cleanDatabase()
      })

      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          const { errors } = await mutate({
            mutation: changeGroupMemberRoleMutation(),
            variables: {
              groupId: 'not-existing-group',
              userId: 'current-user',
              roleInGroup: 'pending',
            },
          })
          expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
        })
      })

      describe('authenticated', () => {
        describe('in all group types – here "closed-group" for example', () => {
          beforeEach(async () => {
            variables = {
              groupId: 'closed-group',
            }
          })

          describe('join the members and give them their prospective roles', () => {
            describe('by owner "owner-member-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerMemberUser.toJson()
              })

              describe('for "usual-member-user"', () => {
                beforeEach(async () => {
                  variables = {
                    ...variables,
                    userId: 'usual-member-user',
                  }
                })

                describe('as usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('has role usual', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation(),
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'usual-member-user',
                          myRoleInGroup: 'usual',
                        },
                      },
                      errors: undefined,
                    })
                  })

                  // the GQL mutation needs this fields in the result for testing
                  it.todo('has "updatedAt" newer as "createdAt"')
                })
              })

              describe('for "admin-member-user"', () => {
                beforeEach(async () => {
                  variables = {
                    ...variables,
                    userId: 'admin-member-user',
                  }
                })

                describe('as admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('has role admin', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation(),
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'admin-member-user',
                          myRoleInGroup: 'admin',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })
              })

              describe('for "second-owner-member-user"', () => {
                beforeEach(async () => {
                  variables = {
                    ...variables,
                    userId: 'second-owner-member-user',
                  }
                })

                describe('as owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('has role owner', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation(),
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'second-owner-member-user',
                          myRoleInGroup: 'owner',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })
              })
            })
          })

          describe('switch role', () => {
            describe('of owner "owner-member-user"', () => {
              beforeEach(async () => {
                variables = {
                  ...variables,
                  userId: 'owner-member-user',
                }
              })

              describe('by owner themself "owner-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await ownerMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })

              // shall this be possible in the future?
              // or shall only an owner who gave the second owner the owner role downgrade themself for savety?
              // otherwise the first owner who downgrades the other one has the victory over the group!
              describe('by second owner "second-owner-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await secondOwnerMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })

                describe('to same role owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('has role owner still', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation(),
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'owner-member-user',
                          myRoleInGroup: 'owner',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })
              })

              describe('by admin "admin-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await adminMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })

              describe('by usual member "usual-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await usualMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })

              describe('by still pending member "pending-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await pendingMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })
            })

            describe('of admin "admin-member-user"', () => {
              beforeEach(async () => {
                variables = {
                  ...variables,
                  userId: 'admin-member-user',
                }
              })

              describe('by owner "owner-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await ownerMemberUser.toJson()
                })

                describe('to owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('has role owner', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation(),
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'admin-member-user',
                          myRoleInGroup: 'owner',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })

                describe('back to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })

              describe('by usual member "usual-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await usualMemberUser.toJson()
                })

                describe('upgrade to owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })

                describe('degrade to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })

              describe('by still pending member "pending-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await pendingMemberUser.toJson()
                })

                describe('upgrade to owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })

                describe('degrade to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })

              describe('by none member "current-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await user.toJson()
                })

                describe('upgrade to owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })

                describe('degrade to pending again', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'pending',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })
            })

            describe('of usual member "usual-member-user"', () => {
              beforeEach(async () => {
                variables = {
                  ...variables,
                  userId: 'usual-member-user',
                }
              })

              describe('by owner "owner-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await ownerMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('has role admin', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation(),
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'usual-member-user',
                          myRoleInGroup: 'admin',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })

                describe('back to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('has role usual again', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation(),
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'usual-member-user',
                          myRoleInGroup: 'usual',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })
              })

              describe('by usual member "usual-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await usualMemberUser.toJson()
                })

                describe('upgrade to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })

                describe('degrade to pending', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'pending',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })

              describe('by still pending member "pending-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await pendingMemberUser.toJson()
                })

                describe('upgrade to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })

                describe('degrade to pending', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'pending',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })

              describe('by none member "current-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await user.toJson()
                })

                describe('upgrade to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })

                describe('degrade to pending again', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'pending',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })
            })

            describe('of still pending member "pending-member-user"', () => {
              beforeEach(async () => {
                variables = {
                  ...variables,
                  userId: 'pending-member-user',
                }
              })

              describe('by owner "owner-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await ownerMemberUser.toJson()
                })

                describe('to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('has role usual', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation(),
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'pending-member-user',
                          myRoleInGroup: 'usual',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })

                describe('back to pending', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'pending',
                    }
                  })

                  it('has role usual again', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation(),
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'pending-member-user',
                          myRoleInGroup: 'pending',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })
              })

              describe('by usual member "usual-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await usualMemberUser.toJson()
                })

                describe('upgrade to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })

              describe('by still pending member "pending-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await pendingMemberUser.toJson()
                })

                describe('upgrade to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })

              describe('by none member "current-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await user.toJson()
                })

                describe('upgrade to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation(),
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
                  })
                })
              })
            })
          })
        })
      })
    })

    describe('LeaveGroup', () => {
      beforeAll(async () => {
        await seedComplexScenarioAndClearAuthentication()
        // closed-group
        authenticatedUser = await ownerMemberUser.toJson()
        await mutate({
          mutation: changeGroupMemberRoleMutation(),
          variables: {
            groupId: 'closed-group',
            userId: 'pending-member-user',
            roleInGroup: 'pending',
          },
        })
        await mutate({
          mutation: changeGroupMemberRoleMutation(),
          variables: {
            groupId: 'closed-group',
            userId: 'usual-member-user',
            roleInGroup: 'usual',
          },
        })
        await mutate({
          mutation: changeGroupMemberRoleMutation(),
          variables: {
            groupId: 'closed-group',
            userId: 'admin-member-user',
            roleInGroup: 'admin',
          },
        })
        await mutate({
          mutation: changeGroupMemberRoleMutation(),
          variables: {
            groupId: 'closed-group',
            userId: 'second-owner-member-user',
            roleInGroup: 'owner',
          },
        })

        authenticatedUser = null
      })

      afterAll(async () => {
        await cleanDatabase()
      })

      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          const { errors } = await mutate({
            mutation: leaveGroupMutation(),
            variables: {
              groupId: 'not-existing-group',
              userId: 'current-user',
            },
          })
          expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
        })
      })

      describe('authenticated', () => {
        describe('in all group types', () => {
          describe('here "closed-group" for example', () => {
            const memberInGroup = async (userId, groupId) => {
              const result = await query({
                query: groupMembersQuery(),
                variables: {
                  id: groupId,
                },
              })
              return result.data && result.data.GroupMembers
                ? !!result.data.GroupMembers.find((member) => member.id === userId)
                : null
            }

            beforeEach(async () => {
              authenticatedUser = null
              variables = {
                groupId: 'closed-group',
              }
            })

            describe('left by "pending-member-user"', () => {
              it('has "null" as membership role, was in the group, and left the group', async () => {
                authenticatedUser = await ownerMemberUser.toJson()
                expect(await memberInGroup('pending-member-user', 'closed-group')).toBe(true)
                authenticatedUser = await pendingMemberUser.toJson()
                await expect(
                  mutate({
                    mutation: leaveGroupMutation(),
                    variables: {
                      ...variables,
                      userId: 'pending-member-user',
                    },
                  }),
                ).resolves.toMatchObject({
                  data: {
                    LeaveGroup: {
                      id: 'pending-member-user',
                      myRoleInGroup: null,
                    },
                  },
                  errors: undefined,
                })
                authenticatedUser = await ownerMemberUser.toJson()
                expect(await memberInGroup('pending-member-user', 'closed-group')).toBe(false)
              })
            })

            describe('left by "usual-member-user"', () => {
              it('has "null" as membership role, was in the group, and left the group', async () => {
                authenticatedUser = await ownerMemberUser.toJson()
                expect(await memberInGroup('usual-member-user', 'closed-group')).toBe(true)
                authenticatedUser = await usualMemberUser.toJson()
                await expect(
                  mutate({
                    mutation: leaveGroupMutation(),
                    variables: {
                      ...variables,
                      userId: 'usual-member-user',
                    },
                  }),
                ).resolves.toMatchObject({
                  data: {
                    LeaveGroup: {
                      id: 'usual-member-user',
                      myRoleInGroup: null,
                    },
                  },
                  errors: undefined,
                })
                authenticatedUser = await ownerMemberUser.toJson()
                expect(await memberInGroup('usual-member-user', 'closed-group')).toBe(false)
              })
            })

            describe('left by "admin-member-user"', () => {
              it('has "null" as membership role, was in the group, and left the group', async () => {
                authenticatedUser = await ownerMemberUser.toJson()
                expect(await memberInGroup('admin-member-user', 'closed-group')).toBe(true)
                authenticatedUser = await adminMemberUser.toJson()
                await expect(
                  mutate({
                    mutation: leaveGroupMutation(),
                    variables: {
                      ...variables,
                      userId: 'admin-member-user',
                    },
                  }),
                ).resolves.toMatchObject({
                  data: {
                    LeaveGroup: {
                      id: 'admin-member-user',
                      myRoleInGroup: null,
                    },
                  },
                  errors: undefined,
                })
                authenticatedUser = await ownerMemberUser.toJson()
                expect(await memberInGroup('admin-member-user', 'closed-group')).toBe(false)
              })
            })

            describe('left by "owner-member-user"', () => {
              it('throws authorization error', async () => {
                authenticatedUser = await ownerMemberUser.toJson()
                const { errors } = await mutate({
                  mutation: leaveGroupMutation(),
                  variables: {
                    ...variables,
                    userId: 'owner-member-user',
                  },
                })
                expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
              })
            })

            describe('left by "second-owner-member-user"', () => {
              it('throws authorization error', async () => {
                authenticatedUser = await secondOwnerMemberUser.toJson()
                const { errors } = await mutate({
                  mutation: leaveGroupMutation(),
                  variables: {
                    ...variables,
                    userId: 'second-owner-member-user',
                  },
                })
                expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
              })
            })

            describe('left by "none-member-user"', () => {
              it('throws authorization error', async () => {
                authenticatedUser = await noMemberUser.toJson()
                const { errors } = await mutate({
                  mutation: leaveGroupMutation(),
                  variables: {
                    ...variables,
                    userId: 'none-member-user',
                  },
                })
                expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
              })
            })

            describe('as "owner-member-user" try to leave member "usual-member-user"', () => {
              it('throws authorization error', async () => {
                authenticatedUser = await ownerMemberUser.toJson()
                const { errors } = await mutate({
                  mutation: leaveGroupMutation(),
                  variables: {
                    ...variables,
                    userId: 'usual-member-user',
                  },
                })
                expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
              })
            })

            describe('as "usual-member-user" try to leave member "admin-member-user"', () => {
              it('throws authorization error', async () => {
                authenticatedUser = await usualMemberUser.toJson()
                const { errors } = await mutate({
                  mutation: leaveGroupMutation(),
                  variables: {
                    ...variables,
                    userId: 'admin-member-user',
                  },
                })
                expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
              })
            })
          })
        })
      })
    })

    describe('UpdateGroup', () => {
      beforeAll(async () => {
        await seedBasicsAndClearAuthentication()
      })

      afterAll(async () => {
        await cleanDatabase()
      })

      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          const { errors } = await mutate({
            mutation: updateGroupMutation(),
            variables: {
              id: 'my-group',
              slug: 'my-best-group',
            },
          })
          expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
        })
      })

      describe('authenticated', () => {
        let noMemberUser

        beforeAll(async () => {
          noMemberUser = await Factory.build(
            'user',
            {
              id: 'none-member-user',
              name: 'None Member TestUser',
            },
            {
              email: 'none-member-user@example.org',
              password: '1234',
            },
          )
          usualMemberUser = await Factory.build(
            'user',
            {
              id: 'usual-member-user',
              name: 'Usual Member TestUser',
            },
            {
              email: 'usual-member-user@example.org',
              password: '1234',
            },
          )
          authenticatedUser = await noMemberUser.toJson()
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'others-group',
              name: 'Uninteresting Group',
              about: 'We will change nothing!',
              description: 'We love it like it is!?' + descriptionAdditional100,
              groupType: 'closed',
              actionRadius: 'global',
              categoryIds,
            },
          })
          authenticatedUser = await user.toJson()
          await mutate({
            mutation: createGroupMutation(),
            variables: {
              id: 'my-group',
              name: 'The Best Group',
              about: 'We will change the world!',
              description: 'Some description' + descriptionAdditional100,
              groupType: 'public',
              actionRadius: 'regional',
              categoryIds,
              locationName: 'Berlin, Germany',
            },
          })
          await mutate({
            mutation: changeGroupMemberRoleMutation(),
            variables: {
              groupId: 'my-group',
              userId: 'usual-member-user',
              roleInGroup: 'usual',
            },
          })
        })

        describe('change group settings', () => {
          describe('as owner', () => {
            beforeEach(async () => {
              authenticatedUser = await user.toJson()
            })

            describe('all standard settings – excluding location', () => {
              it('has updated the settings', async () => {
                await expect(
                  mutate({
                    mutation: updateGroupMutation(),
                    variables: {
                      id: 'my-group',
                      name: 'The New Group For Our Country',
                      about: 'We will change the land!',
                      description: 'Some country relevant description' + descriptionAdditional100,
                      actionRadius: 'national',
                      // avatar, // test this as result
                    },
                  }),
                ).resolves.toMatchObject({
                  data: {
                    UpdateGroup: {
                      id: 'my-group',
                      name: 'The New Group For Our Country',
                      slug: 'the-best-group', // changing the slug is tested in the slugifyMiddleware
                      about: 'We will change the land!',
                      description: 'Some country relevant description' + descriptionAdditional100,
                      descriptionExcerpt:
                        'Some country relevant description' + descriptionAdditional100,
                      actionRadius: 'national',
                      // avatar, // test this as result
                      myRole: 'owner',
                    },
                  },
                  errors: undefined,
                })
              })
            })

            describe('location', () => {
              describe('"locationName" is undefined – shall not change location', () => {
                it('has left locaton unchanged as "Berlin"', async () => {
                  await expect(
                    mutate({
                      mutation: updateGroupMutation(),
                      variables: {
                        id: 'my-group',
                      },
                    }),
                  ).resolves.toMatchObject({
                    data: {
                      UpdateGroup: {
                        id: 'my-group',
                        locationName: 'Berlin, Germany',
                        location: expect.objectContaining({
                          name: 'Berlin',
                          nameDE: 'Berlin',
                          nameEN: 'Berlin',
                        }),
                        myRole: 'owner',
                      },
                    },
                    errors: undefined,
                  })
                })
              })

              describe('"locationName" is null – shall change location "Berlin" to unset location', () => {
                it('has updated the location to unset location', async () => {
                  await expect(
                    mutate({
                      mutation: updateGroupMutation(),
                      variables: {
                        id: 'my-group',
                        locationName: null,
                      },
                    }),
                  ).resolves.toMatchObject({
                    data: {
                      UpdateGroup: {
                        id: 'my-group',
                        locationName: null,
                        location: null,
                        myRole: 'owner',
                      },
                    },
                    errors: undefined,
                  })
                })
              })

              describe('change unset location to "Paris"', () => {
                it('has updated the location to "Paris"', async () => {
                  await expect(
                    mutate({
                      mutation: updateGroupMutation(),
                      variables: {
                        id: 'my-group',
                        locationName: 'Paris, France',
                      },
                    }),
                  ).resolves.toMatchObject({
                    data: {
                      UpdateGroup: {
                        id: 'my-group',
                        locationName: 'Paris, France',
                        location: expect.objectContaining({
                          name: 'Paris',
                          nameDE: 'Paris',
                          nameEN: 'Paris',
                        }),
                        myRole: 'owner',
                      },
                    },
                    errors: undefined,
                  })
                })
              })

              describe('change location "Paris" to "Hamburg"', () => {
                it('has updated the location to "Hamburg"', async () => {
                  await expect(
                    mutate({
                      mutation: updateGroupMutation(),
                      variables: {
                        id: 'my-group',
                        locationName: 'Hamburg, Germany',
                      },
                    }),
                  ).resolves.toMatchObject({
                    data: {
                      UpdateGroup: {
                        id: 'my-group',
                        locationName: 'Hamburg, Germany',
                        location: expect.objectContaining({
                          name: 'Hamburg',
                          nameDE: 'Hamburg',
                          nameEN: 'Hamburg',
                        }),
                        myRole: 'owner',
                      },
                    },
                    errors: undefined,
                  })
                })
              })

              describe('"locationName" is empty string – shall change location "Hamburg" to unset location ', () => {
                it('has updated the location to unset', async () => {
                  await expect(
                    mutate({
                      mutation: updateGroupMutation(),
                      variables: {
                        id: 'my-group',
                        locationName: '', // empty string '' sets it to null
                      },
                    }),
                  ).resolves.toMatchObject({
                    data: {
                      UpdateGroup: {
                        id: 'my-group',
                        locationName: null,
                        location: null,
                        myRole: 'owner',
                      },
                    },
                    errors: undefined,
                  })
                })
              })
            })

            describe('description', () => {
              describe('length without HTML', () => {
                describe('less then 100 chars', () => {
                  it('throws error: "Description too short!"', async () => {
                    const { errors } = await mutate({
                      mutation: updateGroupMutation(),
                      variables: {
                        id: 'my-group',
                        description:
                          '0123456789' +
                          '<a href="https://domain.org/0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789">0123456789</a>',
                      },
                    })
                    expect(errors[0]).toHaveProperty('message', 'Description too short!')
                  })
                })
              })
            })

            describe('categories', () => {
              beforeEach(async () => {
                CONFIG.CATEGORIES_ACTIVE = true
              })

              describe('with matching amount of categories', () => {
                it('has new categories', async () => {
                  await expect(
                    mutate({
                      mutation: updateGroupMutation(),
                      variables: {
                        id: 'my-group',
                        categoryIds: ['cat4', 'cat27'],
                      },
                    }),
                  ).resolves.toMatchObject({
                    data: {
                      UpdateGroup: {
                        id: 'my-group',
                        categories: expect.arrayContaining([
                          expect.objectContaining({ id: 'cat4' }),
                          expect.objectContaining({ id: 'cat27' }),
                        ]),
                        myRole: 'owner',
                      },
                    },
                    errors: undefined,
                  })
                })
              })

              describe('not even one', () => {
                describe('by "categoryIds: []"', () => {
                  it('throws error: "Too view categories!"', async () => {
                    const { errors } = await mutate({
                      mutation: updateGroupMutation(),
                      variables: {
                        id: 'my-group',
                        categoryIds: [],
                      },
                    })
                    expect(errors[0]).toHaveProperty('message', 'Too view categories!')
                  })
                })
              })

              describe('four', () => {
                it('throws error: "Too many categories!"', async () => {
                  const { errors } = await mutate({
                    mutation: updateGroupMutation(),
                    variables: {
                      id: 'my-group',
                      categoryIds: ['cat9', 'cat4', 'cat15', 'cat27'],
                    },
                  })
                  expect(errors[0]).toHaveProperty('message', 'Too many categories!')
                })
              })
            })
          })

          describe('as "usual-member-user" member, no(!) owner', () => {
            it('throws authorization error', async () => {
              authenticatedUser = await usualMemberUser.toJson()
              const { errors } = await mutate({
                mutation: updateGroupMutation(),
                variables: {
                  id: 'my-group',
                  name: 'The New Group For Our Country',
                  about: 'We will change the land!',
                  description: 'Some country relevant description' + descriptionAdditional100,
                  actionRadius: 'national',
                  categoryIds: ['cat4', 'cat27'],
                },
              })
              expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
            })
          })

          describe('as "none-member-user"', () => {
            it('throws authorization error', async () => {
              authenticatedUser = await noMemberUser.toJson()
              const { errors } = await mutate({
                mutation: updateGroupMutation(),
                variables: {
                  id: 'my-group',
                  name: 'The New Group For Our Country',
                  about: 'We will change the land!',
                  description: 'Some country relevant description' + descriptionAdditional100,
                  actionRadius: 'national',
                  categoryIds: ['cat4', 'cat27'],
                },
              })
              expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
            })
          })
        })
      })
    })
  })
})
