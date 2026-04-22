/* eslint-disable import-x/no-named-as-default-member */
import neo4j from 'neo4j-driver'
import Neode from 'neode'

import CONFIG from '@config/index'
import models from '@db/models/index'

import type { Driver } from 'neo4j-driver'

let driver: Driver
let neodeInstance: Neode
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
  if (neodeInstance) {
    // Neode's close() is typed as returning void; the rest of the codebase
    // (see *.spec.ts teardowns) calls it without await.
    neodeInstance.close()
    neodeInstance = undefined as unknown as Neode
  }
}

export function getNeode(options = {}) {
  if (!neodeInstance) {
    const { uri, username, password } = { ...defaultOptions, ...options }
    neodeInstance = new Neode(uri, username, password).with(models)
    neodeInstance.extend('Post', 'Article', {})
    return neodeInstance
  }
  return neodeInstance
}
