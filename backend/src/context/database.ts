/* eslint-disable @typescript-eslint/no-shadow */
import { getDriver, getNeode } from '@db/neo4j'

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
  // The last thing holding neode in the request context. No resolver and no middleware uses it
  // any more (concept stage P5) — it is here for the SPECS, which reach for
  // `database.neode.model(...)` to set up fixtures, and for db/factories.ts behind them. It
  // goes with those, in P6.
  const neode = getNeode()

  return {
    driver,
    neode,
    query: query(driver),
    write: write(driver),
  }
}
