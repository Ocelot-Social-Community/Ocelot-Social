// CLI: promote a user to the `owner` role.
//
// The escape hatch for legacy instances that have no owner yet — the API only
// lets an existing owner grant the owner role, so the first owner must be set
// from the shell. Idempotent.
//
//   npm run db:data:promote-owner <email | slug | id>
//   npm run prod:db:data:promote-owner <email | slug | id>

import { promoteToOwner } from '@src/role/index'

import { closeDriver } from './neo4j'

const identifier = process.argv[2]

void (async function () {
  if (!identifier) {
    // eslint-disable-next-line no-console
    console.error('Usage: db:data:promote-owner <email | slug | id>')
    process.exitCode = 1
    return
  }
  try {
    const user = await promoteToOwner(identifier)
    if (!user) {
      // eslint-disable-next-line no-console
      console.error(`No user found for "${identifier}".`)
      process.exitCode = 1
      return
    }
    // eslint-disable-next-line no-console
    console.log(`Promoted user ${user.slug} (${user.id}) to owner.`)
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exitCode = 1
  } finally {
    await closeDriver()
  }
})()
