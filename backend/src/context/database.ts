/* eslint-disable @typescript-eslint/no-shadow */
import { getDriver } from '@db/neo4j'

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

  // Deliberately WITHOUT the fixture API from db/testing, which used to hang here as
  // `fixtures` and as the deprecated alias `neode`. Nothing in production ever read either,
  // but importing it here put test scaffolding into the production bundle and onto every
  // request context. The specs get it from test/helpers.ts instead, which is the only place
  // that should know db/testing exists.
  return {
    driver,
    query: query(driver),
    write: write(driver),
  }
}
