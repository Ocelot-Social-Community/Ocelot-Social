import { describe, beforeEach, afterAll, it, expect } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'

import { down, up } from './migrations/20261010120000-split-group-chat-right'

const noop = () => undefined

const run = async (query: string, params: Record<string, unknown> = {}) => {
  const session = getDriver().session()
  try {
    return await session.writeTransaction((tx) => tx.run(query, params))
  } finally {
    await session.close()
  }
}

const permissionsOf = async (label: 'GroupRole' | 'GroupRoleTemplate', id: string) => {
  const result = await run(`MATCH (r:${label} {id: $id}) RETURN r.permissions AS permissions`, {
    id,
  })
  return JSON.parse(result.records[0].get('permissions') as string) as string[]
}

const groupRole = async (name: string, permissions: string[]) =>
  run(
    `MERGE (g:Group {id: 'g1'})
     CREATE (g)-[:HAS_GROUP_ROLE]->(:GroupRole {id: 'g1:' + $name, groupId: 'g1', name: $name, permissions: $permissions})`,
    { name, permissions: JSON.stringify(permissions) },
  )

const template = async (name: string, permissions: string[]) =>
  run(
    `CREATE (:GroupRoleTemplate {id: 'public:' + $name, name: $name, permissions: $permissions})`,
    {
      name,
      permissions: JSON.stringify(permissions),
    },
  )

// A member of g1 in that role, in the group's chat room — where the old rule put every member
// who was not an applicant.
const memberInRoom = async (userId: string, roleName: string) =>
  run(
    `MATCH (g:Group {id: 'g1'})
     MERGE (room:Room {id: 'room1'})-[:ROOM_FOR]->(g)
     CREATE (u:User {id: $userId})-[:MEMBER_OF {role: $roleName}]->(g)
     CREATE (u)-[:CHATS_IN]->(room)`,
    { userId, roleName },
  )

const roomParticipants = async () => {
  const result = await run(
    `MATCH (u:User)-[:CHATS_IN]->(:Room {id: 'room1'}) RETURN u.id AS id ORDER BY id`,
  )
  return result.records.map((record) => record.get('id') as string)
}

describe('migration: split-group-chat-right', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await cleanDatabase()
  })

  it('gives a role that could take part in the chat both halves', async () => {
    await groupRole('usual', ['group.read', 'group.content.read', 'group.chat.participate'])

    await up(noop)

    expect(await permissionsOf('GroupRole', 'g1:usual')).toEqual([
      'group.read',
      'group.content.read',
      'group.chat.read',
      'group.chat.write',
    ])
  })

  it('keeps a member role without it reading, since the right only ever gated writing', async () => {
    await groupRole('usual', ['group.read', 'group.content.read', 'group.leave'])

    await up(noop)

    expect(await permissionsOf('GroupRole', 'g1:usual')).toEqual([
      'group.read',
      'group.content.read',
      'group.leave',
      'group.chat.read',
    ])
  })

  it('gives the non-member role no chat right, even where it reads the content', async () => {
    // A public group's `none` holds group.content.read — the rule above must not reach it.
    await groupRole('none', ['group.read', 'group.content.read', 'group.chat.participate'])
    await template('none', ['group.read', 'group.content.read'])

    await up(noop)

    expect(await permissionsOf('GroupRole', 'g1:none')).toEqual([
      'group.read',
      'group.content.read',
    ])
    expect(await permissionsOf('GroupRoleTemplate', 'public:none')).toEqual([
      'group.read',
      'group.content.read',
    ])
  })

  it('reads an applicant role by what it held, not by its content right', async () => {
    await groupRole('pending', ['group.read', 'group.content.read', 'group.leave'])

    await up(noop)

    expect(await permissionsOf('GroupRole', 'g1:pending')).toEqual([
      'group.read',
      'group.content.read',
      'group.leave',
    ])
  })

  it('rewrites the templates as well as the groups, and is idempotent', async () => {
    await template('usual', ['group.read', 'group.content.read', 'group.chat.participate'])

    await up(noop)
    await up(noop)

    expect(await permissionsOf('GroupRoleTemplate', 'public:usual')).toEqual([
      'group.read',
      'group.content.read',
      'group.chat.read',
      'group.chat.write',
    ])
  })

  it('takes members whose role may not read the chat out of its room', async () => {
    await groupRole('usual', ['group.read', 'group.content.read', 'group.chat.participate'])
    // A custom-edited role that reads nothing: it was in the room only because it was not
    // `pending`.
    await groupRole('admin', ['group.read', 'group.leave'])
    await groupRole('owner', [])
    await memberInRoom('reader', 'usual')
    await memberInRoom('blind', 'admin')
    await memberInRoom('boss', 'owner')

    await up(noop)

    expect(await roomParticipants()).toEqual(['boss', 'reader'])
  })

  it('goes back: participate where writing was held, every member but applicants in the room', async () => {
    await groupRole('usual', ['group.read', 'group.content.read', 'group.chat.participate'])
    await groupRole('admin', ['group.read', 'group.content.read', 'group.leave'])
    await groupRole('pending', ['group.read'])
    await memberInRoom('writer', 'usual')
    await memberInRoom('reader', 'admin')
    await run(
      `MATCH (g:Group {id: 'g1'}) CREATE (:User {id: 'applicant'})-[:MEMBER_OF {role: 'pending'}]->(g)`,
    )

    await up(noop)
    await run(`MATCH (:User {id: 'reader'})-[c:CHATS_IN]->() DELETE c`)
    await down(noop)

    expect(await permissionsOf('GroupRole', 'g1:usual')).toEqual([
      'group.read',
      'group.content.read',
      'group.chat.participate',
    ])
    expect(await permissionsOf('GroupRole', 'g1:admin')).toEqual([
      'group.read',
      'group.content.read',
      'group.leave',
    ])
    expect(await roomParticipants()).toEqual(['reader', 'writer'])
  })

  it('refuses a role with a malformed list instead of guessing', async () => {
    await run(`CREATE (:GroupRole {id: 'g1:broken', name: 'broken', permissions: 'not json'})`)

    await expect(up(noop)).rejects.toThrow(/g1:broken has malformed permissions JSON/)
  })
})
