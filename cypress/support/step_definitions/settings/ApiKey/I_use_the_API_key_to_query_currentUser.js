import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import { GraphQLClient } from 'graphql-request'
import CONFIG from '../../../../../backend/build/src/config'

defineStep('I use the API key to query currentUser', () => {
  cy.task('getValue', 'apiKeySecret').then((secret) => {
    const client = new GraphQLClient(CONFIG.GRAPHQL_URI, {
      headers: { authorization: `Bearer ${secret}` },
    })
    const query = `query { currentUser { id name } }`
    cy.wrap(client.request(query)).then((response) => {
      cy.task('pushValue', { name: 'apiKeyResponse', value: response })
    })
  })
})
