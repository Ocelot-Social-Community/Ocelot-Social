/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// eslint-disable-next-line import/no-unassigned-import, n/no-unpublished-import
import 'tsconfig-paths/register'
import { createTestClient } from 'apollo-server-testing'

import databaseContext from '@context/database'
import createServer, { getContext } from '@src/server'

let authenticatedUser = null
// eslint-disable-next-line @typescript-eslint/require-await
const contextUser = async (_req) => authenticatedUser

global.database = databaseContext()
global.authenticateUser = (user) => {
  authenticatedUser = user
}
const context = getContext({ user: contextUser, database: global.database })
global.server = createServer({ context }).server
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
global.client = createTestClient(global.server)

// eslint-disable-next-line @typescript-eslint/no-empty-function
export default async () => {}
