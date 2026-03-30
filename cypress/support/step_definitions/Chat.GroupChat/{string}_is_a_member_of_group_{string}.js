import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../factories'

defineStep('{string} is a member of group {string}', (userSlug, groupId) => {
  cy.neode().then((neode) => {
    return neode.writeCypher(
      `MATCH (user:User {slug: $userSlug}), (group:Group {id: $groupId})
       MERGE (user)-[membership:MEMBER_OF]->(group)
       ON CREATE SET
         membership.createdAt = toString(datetime()),
         membership.updatedAt = toString(datetime()),
         membership.role = 'usual'`,
      { userSlug, groupId },
    )
  })
})
