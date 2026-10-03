import { getDriver } from '@db/neo4j'

export const description =
  'Mark the `admin` group role as a system role, in every group and in every template. It was seeded as an ordinary role a group could rename, delete or replace, which only made sense while a group could also define roles of its own; with that parked (#10356) a group whose admin role had been deleted would have had no way back to one. Only the `system` flag changes — no permission is added or taken away. Idempotent.'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    await session.run(`MATCH (r:GroupRole {name: 'admin'}) SET r.system = true`)
    await session.run(`MATCH (t:GroupRoleTemplate {name: 'admin'}) SET t.system = true`)
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    await session.run(`MATCH (r:GroupRole {name: 'admin'}) SET r.system = false`)
    await session.run(`MATCH (t:GroupRoleTemplate {name: 'admin'}) SET t.system = false`)
  } finally {
    await session.close()
  }
}
