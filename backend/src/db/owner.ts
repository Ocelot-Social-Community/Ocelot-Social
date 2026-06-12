/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/require-await */

import { hashSync } from 'bcryptjs'
import { v4 as uuid } from 'uuid'

import { seedDefaultRoleNodes } from '@src/role'

import { getDriver } from './neo4j'

// The bootstrap account: the instance OWNER (protected failsafe superuser). The
// single role is the HAS_ROLE -> owner edge created below. Login stays
// admin@example.org / 1234.
const defaultOwner = {
  email: 'admin@example.org',
  // eslint-disable-next-line n/no-sync
  password: hashSync('1234', 10),
  name: 'admin',
  id: uuid(),
  slug: 'admin',
}

const createDefaultOwnerUser = async () => {
  // Seed the role nodes first so the owner edge can be created (this CLI never
  // runs RoleService.init).
  await seedDefaultRoleNodes()
  const driver = getDriver()
  const session = driver.session()
  const createOwnerTxResultPromise = session.writeTransaction(async (txc) => {
    txc.run(
      `MERGE (e:EmailAddress {
        email: "${defaultOwner.email}",
        createdAt: toString(datetime())
        })-[:BELONGS_TO]->(u:User {
        name: "${defaultOwner.name}",
        encryptedPassword: "${defaultOwner.password}",
        id: "${defaultOwner.id}",
        slug: "${defaultOwner.slug}",
        createdAt: toString(datetime()),
        allowEmbedIframes: false,
        showShoutsPublicly: false,
        deleted: false,
        disabled: false
        })-[:PRIMARY_EMAIL]->(e)
        WITH u
        MATCH (r:Role {id: 'owner'})
        MERGE (u)-[:HAS_ROLE]->(r)`,
    )
  })
  try {
    await createOwnerTxResultPromise
    console.log('Successfully created default owner user!') // eslint-disable-line no-console
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    console.log(error) // eslint-disable-line no-console
  } finally {
    session.close()
    driver.close()
  }
}

;(async function () {
  await createDefaultOwnerUser()
})()
