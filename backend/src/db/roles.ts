// CLI: reset the default roles to their factory definitions.
//
// Unlike the boot-seed (ON CREATE only, edit-respecting), this FORCE-OVERWRITES
// the owner/admin/moderator/user roles with their shipped defaults. It is the
// repair / lockout-recovery path: if an admin has misconfigured (or deleted) the
// built-in roles, an operator restores them from the shell.
//
//   npm run db:data:roles          (dev, via tsx)
//   npm run prod:db:data:roles     (prod, via node build/)

import databaseContext from '@context/database'
import { DEFAULT_ROLES } from '@src/role'
import { writeRole } from '@src/role/repository'

import { closeDriver } from './neo4j'

const resetDefaultRoles = async () => {
  const db = databaseContext()
  const now = new Date().toISOString()
  for (const role of DEFAULT_ROLES) {
    await writeRole(db, role, 'system:factory-reset', now)
    // eslint-disable-next-line no-console
    console.log(`Reset role '${role.name}' to factory default.`)
  }
}

void (async function () {
  try {
    await resetDefaultRoles()
    // eslint-disable-next-line no-console
    console.log('Successfully reset default roles!')
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exitCode = 1
  } finally {
    await closeDriver()
  }
})()
