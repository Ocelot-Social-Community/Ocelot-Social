import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import CONFIG from '../../../../../backend/build/src/config'

defineStep('I use the revoked API key to query currentUser', () => {
  cy.task('getValue', 'apiKeySecret').then((secret) => {
    cy.request({
      method: 'POST',
      url: CONFIG.GRAPHQL_URI,
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: { query: '{ currentUser { id name } }' },
      failOnStatusCode: false,
    }).then((response) => {
      cy.task('pushValue', { name: 'revokedApiKeyResponse', value: response.body })
    })
  })
})
