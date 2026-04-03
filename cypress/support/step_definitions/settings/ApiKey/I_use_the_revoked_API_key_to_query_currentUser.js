import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I use the revoked API key to query currentUser', () => {
  cy.task('getValue', 'apiKeySecret').then((secret) => {
    expect(secret).to.be.a('string').and.match(/^oak_/)
    cy.request({
      method: 'POST',
      url: Cypress.env('GRAPHQL_URI'),
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: { query: '{ currentUser { id name } }' },
      failOnStatusCode: false,
    }).then((response) => {
      cy.task('pushValue', { name: 'revokedApiKeyResponse', value: response.body })
    })
  })
})
