import { getDriver } from '@db/neo4j'
import { DEFAULT_GROUP_ROLE_TEMPLATES } from '@src/groupRole'

export const description =
  'Seed the `channel` group role template: everybody may read and join, only the people running it write. The first template that is NOT named after the visibility it produces — it produces `public`, and what distinguishes it sits in the member role. It replaces the "turn this into a channel" button, which silently took two rights off `usual` in a way nobody could see beforehand or recognise afterwards. Only adds rows; no existing template or group is touched. Idempotent.'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const now = new Date().toISOString()
  try {
    for (const role of DEFAULT_GROUP_ROLE_TEMPLATES.channel) {
      await session.run(
        `MERGE (t:GroupRoleTemplate { id: $id })
         ON CREATE SET t.createdAt = $now, t.template = $template, t.name = $name
         SET t.permissions = $permissions,
             t.system = $system,
             t.protected = $protected,
             t.label = null`,
        {
          id: `channel:${role.name}`,
          template: 'channel',
          name: role.name,
          permissions: JSON.stringify(role.permissions),
          system: role.system,
          protected: role.protected,
          now,
        },
      )
    }
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    // Groups that were given this template keep their roles — only the template itself goes.
    await session.run(`MATCH (t:GroupRoleTemplate { template: 'channel' }) DETACH DELETE t`)
  } finally {
    await session.close()
  }
}
