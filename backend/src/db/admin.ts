/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { hashSync } from 'bcryptjs'
import { v4 as uuid } from 'uuid'

import { getDriver } from './neo4j'

const defaultAdmin = {
  email: 'admin@example.org',
  // eslint-disable-next-line n/no-sync
  password: hashSync('1234', 10),
  name: 'admin',
  id: uuid(),
  slug: 'admin',
}

const createDefaultAdminUser = async () => {
  const driver = getDriver()
  const session = driver.session()
  const createAdminTxResultPromise = session.writeTransaction(async (txc) => {
    txc.run(
      `MERGE (e:EmailAddress {
        email: "${defaultAdmin.email}",
        createdAt: toString(datetime())
        })-[:BELONGS_TO]->(u:User {
        name: "${defaultAdmin.name}",
        encryptedPassword: "${defaultAdmin.password}",
        role: "admin",
        id: "${defaultAdmin.id}",
        slug: "${defaultAdmin.slug}",
        createdAt: toString(datetime()),
        allowEmbedIframes: false,
        showShoutsPublicly: false,
        deleted: false,
        disabled: false
        })-[:PRIMARY_EMAIL]->(e)`,
    )
  })
  try {
    await createAdminTxResultPromise
    console.log('Successfully created default admin user!') // eslint-disable-line no-console
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    console.log(error) // eslint-disable-line no-console
  } finally {
    session.close()
    driver.close()
  }
}

;(async function () {
  await createDefaultAdminUser()
})()
