import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../../factories'

// What the group's member role grants in its chat: "read and write in", "only read" or "not
// read". Rewritten on the stored role, the way an edit in the rights screen would leave it —
// minus the room sync that edit runs, which is why it has to happen before the room exists.
const CHAT_RIGHTS = {
  'read and write in': ['group.chat.read', 'group.chat.write'],
  'only read': ['group.chat.read'],
  'not read': [],
}

defineStep('the members of group {string} may {string} its chat', (groupId, mode) => {
  const keep = CHAT_RIGHTS[mode]
  if (!keep) throw new Error(`Unknown chat mode "${mode}"; expected ${Object.keys(CHAT_RIGHTS)}`)
  cy.fixtures().then((fixtures) =>
    fixtures.cypher(
      `MATCH (:Group {id: $groupId})-[:HAS_GROUP_ROLE]->(role:GroupRole {name: 'usual'})
       SET role.permissions = apoc.convert.toJson(
         [key IN apoc.convert.fromJsonList(role.permissions)
            WHERE NOT key IN ['group.chat.read', 'group.chat.write']] + $keep)`,
      { groupId, keep },
    ),
  )
})
