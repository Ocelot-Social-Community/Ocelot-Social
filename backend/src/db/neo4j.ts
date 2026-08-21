/* eslint-disable import-x/no-named-as-default-member */
import neo4j from 'neo4j-driver'

import CONFIG from '@config/index'

import type { Driver } from 'neo4j-driver'

// One driver, no ORM. Everything that used to go through neode now writes Cypher: the
// resolvers directly (concept stage P5), the fixtures through db/testing (P6).
let driver: Driver
const defaultOptions = {
  uri: CONFIG.NEO4J_URI,
  username: CONFIG.NEO4J_USERNAME,
  password: CONFIG.NEO4J_PASSWORD,
}

export function getDriver(options = {}) {
  const { uri, username, password } = { ...defaultOptions, ...options }
  if (!driver) {
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
    })
  }
  return driver
}

export async function closeDriver() {
  if (driver) {
    await driver.close()
    driver = undefined as unknown as Driver
  }
}
