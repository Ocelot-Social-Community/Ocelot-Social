/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable import/no-named-as-default-member */
import neo4j, { Driver } from 'neo4j-driver'
import Neode from 'neode'

import CONFIG from '@config/index'
import models from '@models/index'

let driver: Driver
const defaultOptions = {
  uri: CONFIG.NEO4J_URI,
  username: CONFIG.NEO4J_USERNAME,
  password: CONFIG.NEO4J_PASSWORD,
}

export function getDriver(options = {}) {
  const { uri, username, password } = { ...defaultOptions, ...options }
  if (!driver) {
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password))
  }
  return driver
}

let neodeInstance: Neode
export function getNeode(options = {}) {
  if (!neodeInstance) {
    const { uri, username, password } = { ...defaultOptions, ...options }
    neodeInstance = new Neode(uri, username, password).with(models)
    neodeInstance.extend('Post', 'Article', {})
    return neodeInstance
  }
  return neodeInstance
}
