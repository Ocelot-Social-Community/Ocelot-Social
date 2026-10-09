import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../../factories'

// The post factory knows no group; a post belongs to one by its IN edge, which is what every
// visibility rule reads.
defineStep('the post {string} is in group {string}', (postId, groupId) => {
  cy.fixtures().then((fixtures) =>
    fixtures.cypher(
      `MATCH (post:Post {id: $postId}), (group:Group {id: $groupId})
       MERGE (post)-[:IN]->(group)`,
      { postId, groupId },
    ),
  )
})
