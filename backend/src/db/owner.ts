/* eslint-disable @typescript-eslint/no-floating-promises */

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
    // Return the run promise so writeTransaction awaits the query before
    // committing — otherwise the callback resolves immediately and the commit can
    // race the (possibly unfinished) write.
    // Idempotent bootstrap: MERGE only on the stable identifier (email) and set
    // every other property via ON CREATE SET. Putting volatile values
    // (createdAt = datetime(), id = a fresh uuid per run) into the MERGE match
    // would never re-match the existing owner, so each run would spawn a
    // duplicate. Re-running now finds the existing owner and is a no-op.
    return txc.run(
      `MERGE (e:EmailAddress {email: $email})
        ON CREATE SET e.createdAt = toString(datetime())
        MERGE (u:User)-[:PRIMARY_EMAIL]->(e)
        ON CREATE SET
          u.name = $name,
          u.encryptedPassword = $password,
          u.id = $id,
          u.slug = $slug,
          u.createdAt = toString(datetime()),
          u.allowEmbedIframes = false,
          u.showShoutsPublicly = false,
          u.deleted = false,
          u.disabled = false
        MERGE (e)-[:BELONGS_TO]->(u)
        WITH u
        MATCH (r:Role {id: 'owner'})
        MERGE (u)-[:HAS_ROLE]->(r)`,
      {
        email: defaultOwner.email,
        name: defaultOwner.name,
        password: defaultOwner.password,
        id: defaultOwner.id,
        slug: defaultOwner.slug,
      },
    )
  })
  try {
    await createOwnerTxResultPromise
    console.log('Successfully created default owner user!') // eslint-disable-line no-console
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    console.error(error) // eslint-disable-line no-console
    // Signal failure so a broken bootstrap doesn't exit 0 (matches promote-owner).
    process.exitCode = 1
  } finally {
    await session.close()
    await driver.close()
  }
}

;(async function () {
  await createDefaultOwnerUser()
})()
