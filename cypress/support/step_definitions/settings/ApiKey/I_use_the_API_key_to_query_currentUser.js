import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import { GraphQLClient } from 'graphql-request'

defineStep('I use the API key to query currentUser', () => {
  cy.task('getValue', 'apiKeySecret').then((secret) => {
    const client = new GraphQLClient(Cypress.env('GRAPHQL_URI'), {
      headers: { authorization: `Bearer ${secret}` },
    })
    const query = `query { currentUser { id name } }`
    cy.wrap(client.request(query)).then((response) => {
      cy.task('pushValue', { name: 'apiKeyResponse', value: response })
    })
  })
})
