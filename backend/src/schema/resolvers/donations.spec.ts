import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import gql from 'graphql-tag'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'

let mutate, query, authenticatedUser, variables
const instance = getNeode()
const driver = getDriver()

const updateDonationsMutation = gql`
  mutation ($showDonations: Boolean, $goal: Int, $progress: Int) {
    UpdateDonations(showDonations: $showDonations, goal: $goal, progress: $progress) {
      id
      showDonations
      goal
      progress
      createdAt
      updatedAt
    }
  }
`
const donationsQuery = gql`
  query {
    Donations {
      id
      showDonations
      goal
      progress
    }
  }
`

beforeAll(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

describe('donations', () => {
  let currentUser, newlyCreatedDonations
  beforeAll(async () => {
    await cleanDatabase()
    authenticatedUser = undefined
    const { server } = createServer({
      context: () => {
        return {
          driver,
          neode: instance,
          user: authenticatedUser,
        }
      },
    })
    mutate = createTestClient(server).mutate
    query = createTestClient(server).query
  })

  beforeEach(async () => {
    variables = {}
    newlyCreatedDonations = await Factory.build('donations')
  })

  // TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
  afterEach(async () => {
    await cleanDatabase()
  })

  describe('query for donations', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = undefined
        await expect(query({ query: donationsQuery, variables })).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated', () => {
      beforeEach(async () => {
        currentUser = await Factory.build('user', {
          id: 'normal-user',
          role: 'user',
        })
        authenticatedUser = await currentUser.toJson()
      })

      it('returns the current Donations info', async () => {
        await expect(query({ query: donationsQuery, variables })).resolves.toMatchObject({
          data: { Donations: { showDonations: true, goal: 15000, progress: 7000 } },
          errors: undefined,
        })
      })
    })
  })

  describe('update donations', () => {
    beforeEach(() => {
      variables = { showDonations: false, goal: 20000, progress: 3000 }
    })

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = undefined
        await expect(
          mutate({ mutation: updateDonationsMutation, variables }),
        ).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated', () => {
      describe('as a normal user', () => {
        beforeEach(async () => {
          currentUser = await Factory.build('user', {
            id: 'normal-user',
            role: 'user',
          })
          authenticatedUser = await currentUser.toJson()
        })

        it('throws authorization error', async () => {
          await expect(
            mutate({ mutation: updateDonationsMutation, variables }),
          ).resolves.toMatchObject({
            data: { UpdateDonations: null },
            errors: [{ message: 'Not Authorized!' }],
          })
        })
      })

      describe('as a moderator', () => {
        beforeEach(async () => {
          currentUser = await Factory.build('user', {
            id: 'moderator',
            role: 'moderator',
          })
          authenticatedUser = await currentUser.toJson()
        })

        it('throws authorization error', async () => {
          await expect(
            mutate({ mutation: updateDonationsMutation, variables }),
          ).resolves.toMatchObject({
            data: { UpdateDonations: null },
            errors: [{ message: 'Not Authorized!' }],
          })
        })
      })

      describe('as an admin', () => {
        beforeEach(async () => {
          currentUser = await Factory.build('user', {
            id: 'admin',
            role: 'admin',
          })
          authenticatedUser = await currentUser.toJson()
        })

        it('updates Donations info', async () => {
          await expect(
            mutate({ mutation: updateDonationsMutation, variables }),
          ).resolves.toMatchObject({
            data: { UpdateDonations: { showDonations: false, goal: 20000, progress: 3000 } },
            errors: undefined,
          })
        })

        it('updates the updatedAt attribute', async () => {
          newlyCreatedDonations = await newlyCreatedDonations.toJson()
          const {
            data: { UpdateDonations },
          } = await mutate({ mutation: updateDonationsMutation, variables })
          expect(newlyCreatedDonations.updatedAt).toBeTruthy()
          expect(Date.parse(newlyCreatedDonations.updatedAt)).toEqual(expect.any(Number))
          expect(UpdateDonations.updatedAt).toBeTruthy()
          expect(Date.parse(UpdateDonations.updatedAt)).toEqual(expect.any(Number))
          expect(newlyCreatedDonations.updatedAt).not.toEqual(UpdateDonations.updatedAt)
        })
      })
    })
  })
})
