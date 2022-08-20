import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import {
  createGroupMutation,
  joinGroupMutation,
  switchGroupMemberRoleMutation,
  groupMemberQuery,
  groupQuery,
} from '../../db/graphql/groups'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'
import CONFIG from '../../config'

const driver = getDriver()
const neode = getNeode()

let isCleanDbAfterEach = true
let isSeedDb = true
let authenticatedUser
let user

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
const { query } = createTestClient(server)
const { mutate } = createTestClient(server)

beforeAll(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
})

beforeEach(async () => {
  // Wolle: find a better solution
  if (isSeedDb) {
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
        slug: 'democracy-politics',
        icon: 'university',
      }),
      neode.create('Category', {
        id: 'cat4',
        name: 'Environment & Nature',
        slug: 'environment-nature',
        icon: 'tree',
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
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  if (isCleanDbAfterEach) {
    await cleanDatabase()
  }
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
            myRole: 'owner',
          },
        },
        errors: undefined,
      }
      await expect(mutate({ mutation: createGroupMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })

    it('has "disabled" and "deleted" default to "false"', async () => {
      const expected = { data: { CreateGroup: { disabled: false, deleted: false } } }
      await expect(mutate({ mutation: createGroupMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })

    describe('description', () => {
      describe('length without HTML', () => {
        describe('less then 100 chars', () => {
          it('throws error: "Too view categories!"', async () => {
            const { errors } = await mutate({
              mutation: createGroupMutation,
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

      describe('not even one', () => {
        it('throws error: "Too view categories!"', async () => {
          const { errors } = await mutate({
            mutation: createGroupMutation,
            variables: { ...variables, categoryIds: null },
          })
          expect(errors[0]).toHaveProperty('message', 'Too view categories!')
        })
      })

      describe('four', () => {
        it('throws error: "Too many categories!"', async () => {
          const { errors } = await mutate({
            mutation: createGroupMutation,
            variables: { ...variables, categoryIds: ['cat9', 'cat4', 'cat15', 'cat27'] },
          })
          expect(errors[0]).toHaveProperty('message', 'Too many categories!')
        })
      })
    })
  })
})

describe('Group', () => {
  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      const { errors } = await query({ query: groupQuery, variables: {} })
      expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
    })
  })

  describe('authenticated', () => {
    let otherUser

    beforeEach(async () => {
      otherUser = await Factory.build(
        'user',
        {
          id: 'other-user',
          name: 'Other TestUser',
        },
        {
          email: 'test2@example.org',
          password: '1234',
        },
      )
      authenticatedUser = await otherUser.toJson()
      await mutate({
        mutation: createGroupMutation,
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
        mutation: createGroupMutation,
        variables: {
          id: 'my-group',
          name: 'The Best Group',
          about: 'We will change the world!',
          description: 'Some description' + descriptionAdditional100,
          groupType: 'public',
          actionRadius: 'regional',
          categoryIds,
        },
      })
    })

    describe('query groups', () => {
      describe('without any filters', () => {
        it('finds all groups', async () => {
          const expected = {
            data: {
              Group: expect.arrayContaining([
                expect.objectContaining({
                  id: 'my-group',
                  slug: 'the-best-group',
                  myRole: 'owner',
                }),
                expect.objectContaining({
                  id: 'others-group',
                  slug: 'uninteresting-group',
                  myRole: null,
                }),
              ]),
            },
            errors: undefined,
          }
          await expect(query({ query: groupQuery, variables: {} })).resolves.toMatchObject(expected)
        })
      })

      describe('isMember = true', () => {
        it('finds only groups where user is member', async () => {
          const expected = {
            data: {
              Group: [
                {
                  id: 'my-group',
                  slug: 'the-best-group',
                  myRole: 'owner',
                },
              ],
            },
            errors: undefined,
          }
          await expect(
            query({ query: groupQuery, variables: { isMember: true } }),
          ).resolves.toMatchObject(expected)
        })
      })

      describe('isMember = false', () => {
        it('finds only groups where user is not(!) member', async () => {
          const expected = {
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
          }
          await expect(
            query({ query: groupQuery, variables: { isMember: false } }),
          ).resolves.toMatchObject(expected)
        })
      })
    })
  })
})

describe('JoinGroup', () => {
  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      variables = {
        id: 'not-existing-group',
        userId: 'current-user',
      }
      const { errors } = await mutate({ mutation: joinGroupMutation, variables })
      expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
    })
  })

  describe('authenticated', () => {
    let ownerOfClosedGroupUser
    let ownerOfHiddenGroupUser

    beforeEach(async () => {
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
      authenticatedUser = await ownerOfClosedGroupUser.toJson()
      await mutate({
        mutation: createGroupMutation,
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
        mutation: createGroupMutation,
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
        mutation: createGroupMutation,
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
      describe('entered by "owner-of-closed-group"', () => {
        it('has "usual" as membership role', async () => {
          variables = {
            id: 'public-group',
            userId: 'owner-of-closed-group',
          }
          const expected = {
            data: {
              JoinGroup: {
                id: 'owner-of-closed-group',
                myRoleInGroup: 'usual',
              },
            },
            errors: undefined,
          }
          await expect(
            mutate({
              mutation: joinGroupMutation,
              variables,
            }),
          ).resolves.toMatchObject(expected)
        })
      })

      describe('entered by its owner', () => {
        describe('does not create additional "MEMBER_OF" relation and therefore', () => {
          it('has still "owner" as membership role', async () => {
            variables = {
              id: 'public-group',
              userId: 'current-user',
            }
            const expected = {
              data: {
                JoinGroup: {
                  id: 'current-user',
                  myRoleInGroup: 'owner',
                },
              },
              errors: undefined,
            }
            await expect(
              mutate({
                mutation: joinGroupMutation,
                variables,
              }),
            ).resolves.toMatchObject(expected)
          })
        })
      })
    })

    describe('closed group', () => {
      describe('entered by "current-user"', () => {
        it('has "pending" as membership role', async () => {
          variables = {
            id: 'closed-group',
            userId: 'current-user',
          }
          const expected = {
            data: {
              JoinGroup: {
                id: 'current-user',
                myRoleInGroup: 'pending',
              },
            },
            errors: undefined,
          }
          await expect(
            mutate({
              mutation: joinGroupMutation,
              variables,
            }),
          ).resolves.toMatchObject(expected)
        })
      })

      describe('entered by its owner', () => {
        describe('does not create additional "MEMBER_OF" relation and therefore', () => {
          it('has still "owner" as membership role', async () => {
            variables = {
              id: 'closed-group',
              userId: 'owner-of-closed-group',
            }
            const expected = {
              data: {
                JoinGroup: {
                  id: 'owner-of-closed-group',
                  myRoleInGroup: 'owner',
                },
              },
              errors: undefined,
            }
            await expect(
              mutate({
                mutation: joinGroupMutation,
                variables,
              }),
            ).resolves.toMatchObject(expected)
          })
        })
      })
    })

    describe('hidden group', () => {
      describe('entered by "owner-of-closed-group"', () => {
        it('has "pending" as membership role', async () => {
          variables = {
            id: 'hidden-group',
            userId: 'owner-of-closed-group',
          }
          const expected = {
            data: {
              JoinGroup: {
                id: 'owner-of-closed-group',
                myRoleInGroup: 'pending',
              },
            },
            errors: undefined,
          }
          await expect(
            mutate({
              mutation: joinGroupMutation,
              variables,
            }),
          ).resolves.toMatchObject(expected)
        })
      })

      describe('entered by its owner', () => {
        describe('does not create additional "MEMBER_OF" relation and therefore', () => {
          it('has still "owner" as membership role', async () => {
            variables = {
              id: 'hidden-group',
              userId: 'owner-of-hidden-group',
            }
            const expected = {
              data: {
                JoinGroup: {
                  id: 'owner-of-hidden-group',
                  myRoleInGroup: 'owner',
                },
              },
              errors: undefined,
            }
            await expect(
              mutate({
                mutation: joinGroupMutation,
                variables,
              }),
            ).resolves.toMatchObject(expected)
          })
        })
      })
    })
  })
})

describe('SwitchGroupMemberRole', () => {
  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      variables = {
        id: 'not-existing-group',
        userId: 'current-user',
        roleInGroup: 'pending',
      }
      const { errors } = await mutate({ mutation: switchGroupMemberRoleMutation, variables })
      expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
    })
  })

  describe('authenticated', () => {
    describe('in building up mode', () => {
      let usualMemberUser
      let adminMemberUser
      let ownerMemberUser
      // let secondOwnerMemberUser

      beforeEach(async () => {
        // Wolle: change this to beforeAll?
        if (isSeedDb) {
          // create users
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
          // secondOwnerMemberUser =
          await Factory.build(
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
          authenticatedUser = await usualMemberUser.toJson()
          await mutate({
            mutation: createGroupMutation,
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
          authenticatedUser = await ownerMemberUser.toJson()
          await mutate({
            mutation: createGroupMutation,
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
          authenticatedUser = await adminMemberUser.toJson()
          await mutate({
            mutation: createGroupMutation,
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
          // create additional memberships
          // public-group
          authenticatedUser = await usualMemberUser.toJson()
          await mutate({
            mutation: joinGroupMutation,
            variables: {
              id: 'public-group',
              userId: 'owner-of-closed-group',
            },
          })
          await mutate({
            mutation: joinGroupMutation,
            variables: {
              id: 'public-group',
              userId: 'owner-of-hidden-group',
            },
          })
          // closed-group
          authenticatedUser = await ownerMemberUser.toJson()
          await mutate({
            mutation: joinGroupMutation,
            variables: {
              id: 'closed-group',
              userId: 'usual-member-user',
            },
          })
          await mutate({
            mutation: joinGroupMutation,
            variables: {
              id: 'closed-group',
              userId: 'admin-member-user',
            },
          })
          await mutate({
            mutation: joinGroupMutation,
            variables: {
              id: 'closed-group',
              userId: 'second-owner-member-user',
            },
          })
          // hidden-group
          authenticatedUser = await adminMemberUser.toJson()
          await mutate({
            mutation: joinGroupMutation,
            variables: {
              id: 'hidden-group',
              userId: 'admin-member-user',
            },
          })
          await mutate({
            mutation: joinGroupMutation,
            variables: {
              id: 'hidden-group',
              userId: 'second-owner-member-user',
            },
          })
          // Wolle
          // function sleep(ms) {
          //   return new Promise(resolve => setTimeout(resolve, ms));
          // }
          // await sleep(4 * 1000)
          isCleanDbAfterEach = false
          isSeedDb = false
        }
      })
      afterAll(async () => {
        // Wolle: find a better solution
        await cleanDatabase()
        isCleanDbAfterEach = true
        isSeedDb = true
      })

      describe('in all group types – here "closed-group" for example', () => {
        beforeEach(async () => {
          variables = {
            id: 'closed-group',
          }
        })

        describe('switch role', () => {
          describe('of owner member "owner-member-user"', () => {
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
                    mutation: switchGroupMemberRoleMutation,
                    variables,
                  })
                  expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                })
              })
            })
          })

          describe('of prospective admin member "admin-member-user"', () => {
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

              describe('to admin', () => {
                beforeEach(async () => {
                  variables = {
                    ...variables,
                    roleInGroup: 'admin',
                  }
                })

                it('has role admin', async () => {
                  // Wolle:
                  // const groups = await query({ query: groupQuery, variables: {} })
                  // console.log('groups.data.Group: ', groups.data.Group)
                  // const groupMemberOfClosedGroup = await mutate({
                  //   mutation: groupMemberQuery,
                  //   variables: {
                  //     id: 'closed-group',
                  //   },
                  // })
                  // console.log('groupMemberOfClosedGroup.data.GroupMember: ', groupMemberOfClosedGroup.data.GroupMember)
                  const expected = {
                    data: {
                      SwitchGroupMemberRole: {
                        id: 'admin-member-user',
                        myRoleInGroup: 'admin',
                      },
                    },
                    errors: undefined,
                  }
                  await expect(
                    mutate({
                      mutation: switchGroupMemberRoleMutation,
                      variables,
                    }),
                  ).resolves.toMatchObject(expected)
                })
              })
            })

            describe('by still pending member "usual-member-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await usualMemberUser.toJson()
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
                    mutation: switchGroupMemberRoleMutation,
                    variables,
                  })
                  expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                })
              })
            })

            describe('by none member "current-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await user.toJson()
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
                    mutation: switchGroupMemberRoleMutation,
                    variables,
                  })
                  expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                })
              })
            })
          })
        })
      })
    })
  })
})

describe('GroupMember', () => {
  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      variables = {
        id: 'not-existing-group',
      }
      const { errors } = await query({ query: groupMemberQuery, variables })
      expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
    })
  })

  describe('authenticated', () => {
    let otherUser
    let ownerOfClosedGroupUser
    let ownerOfHiddenGroupUser

    beforeEach(async () => {
      // create users
      otherUser = await Factory.build(
        'user',
        {
          id: 'other-user',
          name: 'Other TestUser',
        },
        {
          email: 'test2@example.org',
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
      authenticatedUser = await ownerOfClosedGroupUser.toJson()
      await mutate({
        mutation: createGroupMutation,
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
        mutation: createGroupMutation,
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
        mutation: createGroupMutation,
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
      // create additional memberships
      await mutate({
        mutation: joinGroupMutation,
        variables: {
          id: 'public-group',
          userId: 'owner-of-closed-group',
        },
      })
      await mutate({
        mutation: joinGroupMutation,
        variables: {
          id: 'public-group',
          userId: 'owner-of-hidden-group',
        },
      })
      await mutate({
        mutation: joinGroupMutation,
        variables: {
          id: 'closed-group',
          userId: 'current-user',
        },
      })
      await mutate({
        mutation: joinGroupMutation,
        variables: {
          id: 'hidden-group',
          userId: 'owner-of-closed-group',
        },
      })
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
            const expected = {
              data: {
                GroupMember: expect.arrayContaining([
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
            }
            const result = await mutate({
              mutation: groupMemberQuery,
              variables,
            })
            expect(result).toMatchObject(expected)
            expect(result.data.GroupMember.length).toBe(3)
          })
        })

        describe('by usual member "owner-of-closed-group"', () => {
          beforeEach(async () => {
            authenticatedUser = await ownerOfClosedGroupUser.toJson()
          })

          it('finds all members', async () => {
            const expected = {
              data: {
                GroupMember: expect.arrayContaining([
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
            }
            const result = await mutate({
              mutation: groupMemberQuery,
              variables,
            })
            expect(result).toMatchObject(expected)
            expect(result.data.GroupMember.length).toBe(3)
          })
        })

        describe('by none member "other-user"', () => {
          beforeEach(async () => {
            authenticatedUser = await otherUser.toJson()
          })

          it('finds all members', async () => {
            const expected = {
              data: {
                GroupMember: expect.arrayContaining([
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
            }
            const result = await mutate({
              mutation: groupMemberQuery,
              variables,
            })
            expect(result).toMatchObject(expected)
            expect(result.data.GroupMember.length).toBe(3)
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
            const expected = {
              data: {
                GroupMember: expect.arrayContaining([
                  expect.objectContaining({
                    id: 'current-user',
                    myRoleInGroup: 'pending',
                  }),
                  expect.objectContaining({
                    id: 'owner-of-closed-group',
                    myRoleInGroup: 'owner',
                  }),
                ]),
              },
              errors: undefined,
            }
            const result = await mutate({
              mutation: groupMemberQuery,
              variables,
            })
            expect(result).toMatchObject(expected)
            expect(result.data.GroupMember.length).toBe(2)
          })
        })

        // needs 'SwitchGroupMemberRole'
        describe.skip('by usual member "owner-of-hidden-group"', () => {
          beforeEach(async () => {
            authenticatedUser = await ownerOfHiddenGroupUser.toJson()
          })

          it('finds all members', async () => {
            const expected = {
              data: {
                GroupMember: expect.arrayContaining([
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
            }
            const result = await mutate({
              mutation: groupMemberQuery,
              variables,
            })
            expect(result).toMatchObject(expected)
            expect(result.data.GroupMember.length).toBe(3)
          })
        })

        describe('by pending member "current-user"', () => {
          beforeEach(async () => {
            authenticatedUser = await user.toJson()
          })

          it('throws authorization error', async () => {
            const { errors } = await query({ query: groupMemberQuery, variables })
            expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
          })
        })

        describe('by none member "other-user"', () => {
          beforeEach(async () => {
            authenticatedUser = await otherUser.toJson()
          })

          it('throws authorization error', async () => {
            const { errors } = await query({ query: groupMemberQuery, variables })
            expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
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
            const expected = {
              data: {
                GroupMember: expect.arrayContaining([
                  expect.objectContaining({
                    id: 'owner-of-closed-group',
                    myRoleInGroup: 'pending',
                  }),
                  expect.objectContaining({
                    id: 'owner-of-hidden-group',
                    myRoleInGroup: 'owner',
                  }),
                ]),
              },
              errors: undefined,
            }
            const result = await mutate({
              mutation: groupMemberQuery,
              variables,
            })
            expect(result).toMatchObject(expected)
            expect(result.data.GroupMember.length).toBe(2)
          })
        })

        // needs 'SwitchGroupMemberRole'
        describe.skip('by usual member "owner-of-closed-group"', () => {
          beforeEach(async () => {
            authenticatedUser = await ownerOfClosedGroupUser.toJson()
          })

          it('finds all members', async () => {
            const expected = {
              data: {
                GroupMember: expect.arrayContaining([
                  expect.objectContaining({
                    id: 'current-user',
                    myRoleInGroup: 'pending',
                  }),
                  expect.objectContaining({
                    id: 'owner-of-closed-group',
                    myRoleInGroup: 'usual',
                  }),
                  expect.objectContaining({
                    id: 'owner-of-hidden-group',
                    myRoleInGroup: 'owner',
                  }),
                ]),
              },
              errors: undefined,
            }
            const result = await mutate({
              mutation: groupMemberQuery,
              variables,
            })
            expect(result).toMatchObject(expected)
            expect(result.data.GroupMember.length).toBe(3)
          })
        })

        describe('by pending member "current-user"', () => {
          beforeEach(async () => {
            authenticatedUser = await user.toJson()
          })

          it('throws authorization error', async () => {
            const { errors } = await query({ query: groupMemberQuery, variables })
            expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
          })
        })

        describe('by none member "other-user"', () => {
          beforeEach(async () => {
            authenticatedUser = await otherUser.toJson()
          })

          it('throws authorization error', async () => {
            const { errors } = await query({ query: groupMemberQuery, variables })
            expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
          })
        })
      })
    })
  })
})
