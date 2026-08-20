/* eslint-disable @typescript-eslint/no-shadow */
import { getDriver } from '@db/neo4j'
import { fixtures } from '@db/testing/fixtures'

import type { Driver } from 'neo4j-driver'

export const query =
  (driver: Driver) =>
  async ({ query, variables = {} }: { query: string; variables?: object }) => {
    const session = driver.session()

    const result = session.readTransaction(async (transaction) => {
      const response = await transaction.run(query, variables)
      return response
    })

    try {
      return await result
    } finally {
      await session.close()
    }
  }

export const write =
  (driver: Driver) =>
  async ({ query, variables = {} }: { query: string; variables?: object }) => {
    const session = driver.session()

    const result = session.writeTransaction(async (transaction) => {
      const response = await transaction.run(query, variables)
      return response
    })

    try {
      return await result
    } finally {
      await session.close()
    }
  }

export default () => {
  const driver = getDriver()

  return {
    driver,
    // The fixture API for tests. `neode` is the name 72 spec files know it by and stays as a
    // deprecated alias — it is no longer neode, and nothing in production uses either.
    fixtures,
    neode: fixtures,
    query: query(driver),
    write: write(driver),
  }
}
