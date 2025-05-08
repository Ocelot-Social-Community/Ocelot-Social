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
  const neode = getNeode()

  return {
    driver,
    neode,
    query: query(driver),
    write: write(driver),
  }
}
