import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import { request } from 'graphql-request'
import CONFIG from '../../../../../backend/build/src/config'

defineStep('I use the API key to query currentUser', () => {
  cy.task('getValue', 'apiKeySecret').then((secret) => {
    const query = `query { currentUser { id name } }`
    cy.wrap(
      request(CONFIG.GRAPHQL_URI, query, {}, { authorization: `Bearer ${secret}` }),
    ).then((response) => {
      cy.task('pushValue', { name: 'apiKeyResponse', value: response })
    })
  })
})
