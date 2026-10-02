import { getDriver } from '@db/neo4j'

export const description =
  'Rename `GroupRoleTemplate.groupType` to `template`. The property names which template a role belongs to, and a template is not a group type: the three shipped ones are NAMED after the visibility they produce, but the name identifies the thing an operator edits while the visibility is what a group created from it derives to (see groupRole/privacyLevel.ts). Idempotent.'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    await session.run(`MATCH (r:GroupRoleTemplate)
                       WHERE r.template IS NULL AND r.groupType IS NOT NULL
                       SET r.template = r.groupType`)
    await session.run(`MATCH (r:GroupRoleTemplate) REMOVE r.groupType`)
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    await session.run(`MATCH (r:GroupRoleTemplate)
                       WHERE r.groupType IS NULL AND r.template IS NOT NULL
                       SET r.groupType = r.template`)
  } finally {
    await session.close()
  }
}
